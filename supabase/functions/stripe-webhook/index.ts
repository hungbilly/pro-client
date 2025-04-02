
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@latest';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in the request');
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    console.log(`Received webhook with signature: ${signature.substring(0, 20)}...`);
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-02-24.acacia',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    console.log(`Webhook secret exists: ${webhookSecret ? 'Yes' : 'No'}`);
    
    let event;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log(`Webhook verified: ${event.type}`);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing webhook event: ${event.type}`);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`Processing checkout completion for session: ${session.id}`);
        
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const clientReferenceId = session.client_reference_id;
        
        console.log(`Customer ID: ${customerId}, Subscription ID: ${subscriptionId}, User ID: ${clientReferenceId}`);
        
        if (clientReferenceId && subscriptionId) {
          try {
            // First, check if we already have this subscription in our database
            const { data: existingSubscription, error: checkError } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('stripe_subscription_id', subscriptionId)
              .limit(1)
              .maybeSingle();
              
            if (checkError) {
              console.error(`Error checking existing subscription: ${checkError.message}`);
            }
            
            // If we already have this subscription ID in our database, don't create another record
            if (existingSubscription) {
              console.log(`Subscription ${subscriptionId} already exists in database, skipping creation`);
              
              // If it's for a different user (shouldn't happen, but just in case), update the user_id
              if (existingSubscription.user_id !== clientReferenceId) {
                console.log(`Updating user_id for subscription ${subscriptionId} from ${existingSubscription.user_id} to ${clientReferenceId}`);
                
                await supabase
                  .from('user_subscriptions')
                  .update({
                    user_id: clientReferenceId,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingSubscription.id);
              }
            } else {
              // Check for existing active subscriptions for this user
              const { data: userSubscriptions, error: userSubError } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', clientReferenceId)
                .eq('status', 'active');
                
              if (userSubError) {
                console.error(`Error checking user subscriptions: ${userSubError.message}`);
              } else if (userSubscriptions && userSubscriptions.length > 0) {
                console.log(`User ${clientReferenceId} already has ${userSubscriptions.length} active subscriptions. Marking them as inactive.`);
                
                // Mark all existing active subscriptions as inactive
                for (const sub of userSubscriptions) {
                  await supabase
                    .from('user_subscriptions')
                    .update({ status: 'inactive', updated_at: new Date().toISOString() })
                    .eq('id', sub.id);
                }
              }
              
              // Now retrieve the subscription details from Stripe
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              
              if (subscription) {
                // Create a new subscription record
                const { error: insertError } = await supabase
                  .from('user_subscriptions')
                  .insert({
                    user_id: clientReferenceId,
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    status: subscription.status,
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                  });
                
                if (insertError) {
                  console.error(`Error inserting subscription record: ${insertError.message}`);
                } else {
                  console.log(`Created new subscription record for user ${clientReferenceId}`);
                }
              }
            }
          } catch (error) {
            console.error(`Error processing checkout session: ${error.message}`);
          }
        }
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerIdSub = subscription.customer;
        
        console.log(`Processing subscription event: ${event.type} for customer: ${customerIdSub}`);
        
        try {
          // Get customer to find the associated user
          const customer = await stripe.customers.retrieve(customerIdSub);
          
          if ('deleted' in customer && customer.deleted) {
            console.log(`Customer ${customerIdSub} was deleted`);
            break;
          }
          
          // Find user by customer email in profiles table
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customer.email)
            .maybeSingle();
            
          if (userError || !userData) {
            console.error(`Error finding user: ${userError?.message || 'No user found with email ' + customer.email}`);
            break;
          }
          
          const userId = userData.id;
          
          // Check if the subscription record already exists
          const { data: existingSub, error: checkSubError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('stripe_subscription_id', subscription.id)
            .maybeSingle();
            
          if (checkSubError) {
            console.error(`Error checking existing subscription: ${checkSubError.message}`);
          }
          
          if (existingSub) {
            // Update the existing subscription
            console.log(`Updating existing subscription record for ${subscription.id}`);
            
            await supabase
              .from('user_subscriptions')
              .update({
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSub.id);
          } else {
            // Before creating a new subscription record, check for existing active subscriptions
            if (subscription.status === 'active') {
              const { data: activeSubscriptions } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active');
              
              if (activeSubscriptions && activeSubscriptions.length > 0) {
                console.log(`User ${userId} already has ${activeSubscriptions.length} active subscriptions. Marking them as inactive.`);
                
                // Mark all existing active subscriptions as inactive
                for (const sub of activeSubscriptions) {
                  await supabase
                    .from('user_subscriptions')
                    .update({ status: 'inactive', updated_at: new Date().toISOString() })
                    .eq('id', sub.id);
                }
              }
            }
            
            // Create a new subscription record
            console.log(`Creating new subscription record for user ${userId}`);
            
            await supabase
              .from('user_subscriptions')
              .insert({
                user_id: userId,
                stripe_customer_id: customerIdSub,
                stripe_subscription_id: subscription.id,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              });
          }
        } catch (error) {
          console.error(`Error processing subscription event: ${error.message}`);
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log(`Processing subscription deletion for subscription: ${deletedSubscription.id}`);
        
        try {
          // Find and update the subscription record
          const { data: subToUpdate, error: findSubError } = await supabase
            .from('user_subscriptions')
            .select('id')
            .eq('stripe_subscription_id', deletedSubscription.id)
            .maybeSingle();
            
          if (findSubError) {
            console.error(`Error finding subscription to cancel: ${findSubError.message}`);
            break;
          }
          
          if (subToUpdate) {
            await supabase
              .from('user_subscriptions')
              .update({
                status: 'canceled',
                updated_at: new Date().toISOString()
              })
              .eq('id', subToUpdate.id);
              
            console.log(`Marked subscription ${deletedSubscription.id} as canceled`);
          } else {
            console.log(`No subscription record found for ${deletedSubscription.id}`);
          }
        } catch (error) {
          console.error(`Error processing subscription deletion: ${error.message}`);
        }
        break;
        
      case 'invoice.paid':
        // Handle invoice.paid event
        const invoice = event.data.object;
        console.log(`Processing invoice payment: ${invoice.id} for subscription: ${invoice.subscription}`);
        
        if (invoice.subscription) {
          try {
            // Find the subscription record by subscription ID
            const { data: invoiceSubscription, error: findInvSubError } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('stripe_subscription_id', invoice.subscription)
              .maybeSingle();
              
            if (findInvSubError) {
              console.error(`Error finding subscription for invoice: ${findInvSubError.message}`);
              break;
            }
            
            if (invoiceSubscription) {
              // Get updated subscription from Stripe
              const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
              
              // Update the subscription status and period end
              await supabase
                .from('user_subscriptions')
                .update({
                  status: stripeSubscription.status,
                  current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', invoiceSubscription.id);
                
              console.log(`Updated subscription period end for ${invoice.subscription}`);
            } else {
              console.log(`No subscription record found for ${invoice.subscription} while processing invoice`);
            }
          } catch (error) {
            console.error(`Error processing invoice payment: ${error.message}`);
          }
        }
        break;
        
      case 'invoice.payment_failed':
        // Handle invoice.payment_failed event
        const failedInvoice = event.data.object;
        console.log(`Processing failed invoice payment: ${failedInvoice.id} for subscription: ${failedInvoice.subscription}`);
        
        if (failedInvoice.subscription) {
          try {
            // Find the subscription record by subscription ID
            const { data: failedSubRecord, error: findFailedSubError } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('stripe_subscription_id', failedInvoice.subscription)
              .maybeSingle();
              
            if (findFailedSubError) {
              console.error(`Error finding subscription for failed invoice: ${findFailedSubError.message}`);
              break;
            }
            
            if (failedSubRecord) {
              // Get updated subscription from Stripe
              const stripeSubscription = await stripe.subscriptions.retrieve(failedInvoice.subscription);
              
              // Update the subscription status
              await supabase
                .from('user_subscriptions')
                .update({
                  status: stripeSubscription.status, // This will likely be 'past_due' or 'unpaid'
                  updated_at: new Date().toISOString()
                })
                .eq('id', failedSubRecord.id);
                
              console.log(`Updated subscription status to ${stripeSubscription.status} for ${failedInvoice.subscription}`);
            } else {
              console.log(`No subscription record found for ${failedInvoice.subscription} while processing failed invoice`);
            }
          } catch (error) {
            console.error(`Error processing failed invoice payment: ${error.message}`);
          }
        }
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
