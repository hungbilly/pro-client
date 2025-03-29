
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
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

  // Only accept POST requests for the actual webhook
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in the request');
      return new Response(JSON.stringify({ error: 'No signature', code: 401, message: 'Missing stripe-signature header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the raw request body
    const body = await req.text();
    
    // Initialize Stripe with the secret key and a valid API version
    // Use 2023-10-16 which is known to be compatible with the Stripe SDK we're using
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16', // Updated to a compatible API version
    });

    // Initialize Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the webhook signature
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    console.log(`Attempting to verify webhook with secret: ${webhookSecret ? 'Secret exists' : 'No secret found'}`);
    
    let event;
    
    try {
      // Use constructEventAsync instead of constructEvent
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
    
    // Handle different types of events
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Processing checkout.session.completed:', session.id);
        
        // Extract customer info and subscription details
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const clientReferenceId = session.client_reference_id;
        
        console.log(`Checkout completed - Customer: ${customerId}, Subscription: ${subscriptionId}, User: ${clientReferenceId}`);
        
        // Update subscription_sessions table
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
        
        // If subscription is created, handle it
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
    // Get customer to find user_id
    const customerId = subscription.customer;
    
    console.log(`Processing subscription change for customer: ${customerId}`);
    
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer || customer.deleted) {
      console.error('No customer found or customer was deleted');
      return;
    }
    
    console.log(`Customer email: ${customer.email}`);
    
    // Get user by email
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', customer.email)
      .single();
    
    if (userError) {
      console.error(`Error fetching user by email: ${userError.message}`);
    }
    
    // Try to get user from metadata if available or use email lookup result
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
    
    // Check if user already has a subscription record
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
      // Update existing record
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
      // Insert new record
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
