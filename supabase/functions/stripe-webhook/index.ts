
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
          // Store subscription data in the database
          const { data: subscription, error: subError } = await stripe.subscriptions.retrieve(subscriptionId);
          
          if (subError) {
            console.error(`Error retrieving subscription: ${subError}`);
          } else {
            const { error: insertError } = await supabase
              .from('user_subscriptions')
              .upsert({
                user_id: clientReferenceId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              });
            
            if (insertError) {
              console.error(`Error updating subscription record: ${insertError.message}`);
            } else {
              console.log(`Subscription record updated for user ${clientReferenceId}`);
            }
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
          
          if (customer.deleted) {
            console.log(`Customer ${customerIdSub} was deleted`);
            break;
          }
          
          // Find user by customer email
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
          
          const { error: upsertError } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: customerIdSub,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            });
            
          if (upsertError) {
            console.error(`Error updating subscription: ${upsertError.message}`);
          } else {
            console.log(`Subscription record updated for user ${userId}`);
          }
        } catch (error) {
          console.error(`Error processing subscription event: ${error.message}`);
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
