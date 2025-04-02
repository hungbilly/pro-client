
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
            // Check if a record already exists for this subscription ID
            const { data: existingSubscription, error: checkError } = await supabase
              .from('user_subscriptions')
              .select('id')
              .eq('stripe_subscription_id', subscriptionId)
              .maybeSingle();
              
            if (checkError) {
              console.error(`Error checking existing subscription: ${checkError.message}`);
            }
            
            // Only proceed if no record exists for this subscription ID
            if (!existingSubscription) {
              // Store subscription data in the database
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              
              if (subscription) {
                // First, determine if the user already has active subscriptions
                const { data: userSubs, error: userSubsError } = await supabase
                  .from('user_subscriptions')
                  .select('id, status')
                  .eq('user_id', clientReferenceId)
                  .eq('status', 'active');
                
                if (userSubsError) {
                  console.error(`Error checking existing user subscriptions: ${userSubsError.message}`);
                }
                
                // If user already has active subscriptions, mark them as inactive
                if (userSubs && userSubs.length > 0) {
                  console.log(`User ${clientReferenceId} already has ${userSubs.length} active subscriptions. Marking them as inactive.`);
                  
                  for (const sub of userSubs) {
                    const { error: updateError } = await supabase
                      .from('user_subscriptions')
                      .update({ status: 'inactive' })
                      .eq('id', sub.id);
                    
                    if (updateError) {
                      console.error(`Error updating existing subscription: ${updateError.message}`);
                    }
                  }
                }
                
                // Now insert the new subscription
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
                  console.log(`Subscription record created for user ${clientReferenceId}`);
                }
              }
            } else {
              console.log(`Subscription ${subscriptionId} already exists, skipping insertion`);
            }
          } catch (error) {
            console.error(`Error retrieving subscription: ${error.message}`);
          }
        }
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
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
          
          // Find user by customer email in profiles table instead of auth.users
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customer.email)
            .single();
            
          if (userError) {
            console.error(`Error finding user: ${userError.message}`);
            break;
          }
          
          const userId = userData.id;
          
          // Check if this subscription ID already exists
          const { data: existingSub, error: checkSubError } = await supabase
            .from('user_subscriptions')
            .select('id, status')
            .eq('stripe_subscription_id', subscription.id)
            .maybeSingle();
            
          if (checkSubError) {
            console.error(`Error checking existing subscription: ${checkSubError.message}`);
          }
          
          if (existingSub) {
            // Update the existing subscription
            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update({
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSub.id);
              
            if (updateError) {
              console.error(`Error updating subscription: ${updateError.message}`);
            } else {
              console.log(`Updated subscription ${subscription.id} for user ${userId}`);
            }
          } else {
            // If status becomes active, check if user has other active subscriptions
            if (subscription.status === 'active') {
              // Find all active subscriptions for this user
              const { data: activeSubs, error: activeSubsError } = await supabase
                .from('user_subscriptions')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'active');
                
              if (activeSubsError) {
                console.error(`Error finding active subscriptions: ${activeSubsError.message}`);
              } else if (activeSubs && activeSubs.length > 0) {
                // Mark other active subscriptions as inactive
                console.log(`User ${userId} already has ${activeSubs.length} active subscriptions. Marking them as inactive.`);
                
                for (const sub of activeSubs) {
                  const { error: deactivateError } = await supabase
                    .from('user_subscriptions')
                    .update({ status: 'inactive' })
                    .eq('id', sub.id);
                    
                  if (deactivateError) {
                    console.error(`Error deactivating subscription: ${deactivateError.message}`);
                  }
                }
              }
            }
            
            // Insert new subscription record
            const { error: insertError } = await supabase
              .from('user_subscriptions')
              .insert({
                user_id: userId,
                stripe_customer_id: customerIdSub,
                stripe_subscription_id: subscription.id,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              });
              
            if (insertError) {
              console.error(`Error inserting subscription: ${insertError.message}`);
            } else {
              console.log(`Created new subscription record for user ${userId}`);
            }
          }
        } catch (error) {
          console.error(`Error processing subscription event: ${error.message}`);
        }
        break;
        
      case 'invoice.paid':
        // Handle invoice.paid event
        const invoice = event.data.object;
        console.log(`Processing invoice payment: ${invoice.id} for subscription: ${invoice.subscription}`);
        
        if (invoice.subscription) {
          try {
            // Get the subscription details
            const invoiceSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
            if (!invoiceSubscription) {
              console.log(`No subscription found for invoice ${invoice.id}, skipping`);
              break;
            }
            
            const invoiceCustomerId = invoice.customer;
            if (!invoiceCustomerId) {
              console.log(`No customer ID found for invoice ${invoice.id}, skipping`);
              break;
            }
            
            // Get customer to find the associated user
            const invoiceCustomer = await stripe.customers.retrieve(invoiceCustomerId);
            
            if (!invoiceCustomer || ('deleted' in invoiceCustomer && invoiceCustomer.deleted)) {
              console.log(`Customer ${invoiceCustomerId} not found or was deleted, skipping`);
              break;
            }
            
            if (!invoiceCustomer.email) {
              console.log(`No email found for customer ${invoiceCustomerId}, skipping`);
              break;
            }
            
            // Find user by customer email
            const { data: invoiceUserData, error: invoiceUserError } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', invoiceCustomer.email)
              .single();
              
            if (invoiceUserError || !invoiceUserData) {
              console.error(`Error finding user for invoice: ${invoiceUserError?.message || 'No user found'}`);
              break;
            }
            
            const invoiceUserId = invoiceUserData.id;
            
            // Find subscription record by subscription ID
            const { data: existingInvoiceSub, error: findSubError } = await supabase
              .from('user_subscriptions')
              .select('id')
              .eq('stripe_subscription_id', invoice.subscription)
              .maybeSingle();
              
            if (findSubError) {
              console.error(`Error finding subscription record: ${findSubError.message}`);
            }
            
            if (existingInvoiceSub) {
              // Update existing subscription
              const { error: updateSubError } = await supabase
                .from('user_subscriptions')
                .update({
                  status: invoiceSubscription.status,
                  current_period_end: new Date(invoiceSubscription.current_period_end * 1000).toISOString(),
                  trial_end_date: invoiceSubscription.trial_end ? new Date(invoiceSubscription.trial_end * 1000).toISOString() : null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingInvoiceSub.id);
                
              if (updateSubError) {
                console.error(`Error updating subscription from invoice: ${updateSubError.message}`);
              } else {
                console.log(`Updated subscription record from invoice for user ${invoiceUserId}`);
              }
            } else {
              // If this is a new active subscription, deactivate other active ones
              if (invoiceSubscription.status === 'active') {
                const { data: activeUserSubs, error: findActivesError } = await supabase
                  .from('user_subscriptions')
                  .select('id')
                  .eq('user_id', invoiceUserId)
                  .eq('status', 'active');
                  
                if (findActivesError) {
                  console.error(`Error finding active subscriptions: ${findActivesError.message}`);
                } else if (activeUserSubs && activeUserSubs.length > 0) {
                  console.log(`Deactivating ${activeUserSubs.length} existing active subscriptions for user ${invoiceUserId}`);
                  
                  for (const sub of activeUserSubs) {
                    const { error: deactivateError } = await supabase
                      .from('user_subscriptions')
                      .update({ status: 'inactive' })
                      .eq('id', sub.id);
                      
                    if (deactivateError) {
                      console.error(`Error deactivating subscription: ${deactivateError.message}`);
                    }
                  }
                }
              }
              
              // Insert new subscription record
              const { error: insertNewSubError } = await supabase
                .from('user_subscriptions')
                .insert({
                  user_id: invoiceUserId,
                  stripe_customer_id: invoiceCustomerId,
                  stripe_subscription_id: invoice.subscription,
                  status: invoiceSubscription.status,
                  current_period_end: new Date(invoiceSubscription.current_period_end * 1000).toISOString(),
                  trial_end_date: invoiceSubscription.trial_end ? new Date(invoiceSubscription.trial_end * 1000).toISOString() : null,
                });
                
              if (insertNewSubError) {
                console.error(`Error inserting new subscription from invoice: ${insertNewSubError.message}`);
              } else {
                console.log(`Created new subscription record from invoice for user ${invoiceUserId}`);
              }
            }
          } catch (error) {
            console.error(`Error processing invoice.paid event: ${error.message}`);
          }
        } else {
          console.log(`Invoice ${invoice.id} is not associated with a subscription, skipping`);
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
