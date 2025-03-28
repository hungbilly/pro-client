import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in the request');
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the raw request body
    const body = await req.text();
    
    // Initialize Stripe with the secret key and updated API version
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-02-24', // Updated to match the dashboard version
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the webhook signature
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Webhook event received: ${event.type}`);
    
    // Handle different types of events
    switch (event.type) {
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
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function handleSubscriptionChange(subscription, supabase, stripe) {
  try {
    // Get customer to find user_id
    const customerId = subscription.customer;
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer || customer.deleted) {
      console.error('No customer found or customer was deleted');
      return;
    }
    
    // Get user by email
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', customer.email)
      .single();
    
    if (userError || !userData) {
      // Try to get user from metadata if available
      let userId = customer.metadata?.supabase_user_id;
      
      if (!userId) {
        console.error('Could not find user with matching email and no metadata found');
        return;
      }
    }
    
    const userId = userData?.id || customer.metadata?.supabase_user_id;
    
    // Check if user already has a subscription record
    const { data: existingSubscription, error: subQueryError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
      
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    };
    
    if (existingSubscription) {
      // Update existing record
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
      // Insert new record
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
