
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@latest';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
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
      return new Response(JSON.stringify({ error: 'No signature', code: 401, message: 'Missing stripe-signature header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-02-24', // Removed '.acacia' suffix
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    console.log(`Attempting to verify webhook with secret: ${webhookSecret ? 'Secret exists' : 'No secret found'}`);
    
    let event;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log(`Webhook verified successfully: ${event.type}`);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}`, code: 401 }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Webhook event received: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Processing checkout.session.completed:', session.id);
        
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const clientReferenceId = session.client_reference_id;
        
        console.log(`Checkout completed - Customer: ${customerId}, Subscription: ${subscriptionId}, User: ${clientReferenceId}`);
        
        if (clientReferenceId && session.id) {
          const { error: updateError } = await supabase
            .from('subscription_sessions')
            .update({ status: 'completed' })
            .eq('session_id', session.id)
            .eq('user_id', clientReferenceId);
          
          if (updateError) {
            console.error(`Error updating subscription session: ${updateError.message}`);
          } else {
            console.log(`Updated subscription session ${session.id} to completed`);
          }
        }
        
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await handleSubscriptionChange(subscription, supabase, stripe);
          } catch (error) {
            console.error(`Error processing checkout subscription: ${error.message}`);
          }
        }
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await handleSubscriptionChange(subscription, supabase, stripe);
        break;
      
      case 'invoice.paid':
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await handleSubscriptionChange(subscription, supabase, stripe);
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

async function handleSubscriptionChange(subscription, supabase, stripe) {
  try {
    const customerId = subscription.customer;
    
    console.log(`Processing subscription change for customer: ${customerId}`);
    
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer || customer.deleted) {
      console.error('No customer found or customer was deleted');
      return;
    }
    
    console.log(`Customer email: ${customer.email}`);
    
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', customer.email)
      .single();
    
    if (userError) {
      console.error(`Error fetching user by email: ${userError.message}`);
    }
    
    let userId = customer.metadata?.supabase_user_id;
    
    if (!userId && userData?.id) {
      userId = userData.id;
      console.log(`Found user ID from email lookup: ${userId}`);
    }
    
    if (!userId) {
      console.error('Could not find user ID from metadata or email lookup');
      return;
    }
    
    console.log(`Updating subscription for user ID: ${userId}`);
    
    const { data: existingSubscription, error: subQueryError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
    
    if (subQueryError) {
      console.error(`Error checking existing subscription: ${subQueryError.message}`);
    }
      
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    };
    
    if (existingSubscription) {
      console.log(`Updating existing subscription record: ${existingSubscription.id}`);
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);
        
      if (updateError) {
        console.error(`Error updating subscription: ${updateError.message}`);
      } else {
        console.log(`Updated subscription record for user ${userId}`);
      }
    } else {
      console.log(`Creating new subscription record for user ${userId}`);
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);
        
      if (insertError) {
        console.error(`Error inserting subscription: ${insertError.message}`);
      } else {
        console.log(`Created new subscription record for user ${userId}`);
      }
    }
  } catch (error) {
    console.error(`Error in handleSubscriptionChange: ${error.message}`);
  }
}
