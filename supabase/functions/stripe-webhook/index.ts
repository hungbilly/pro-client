
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@15.12.0?dts';

// CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Stripe client
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature') || '';
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

    if (!signature || !webhookSecret) {
      console.error('Missing Stripe signature or webhook secret');
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature or webhook secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the raw request body
    const body = await req.text();

    // Verify webhook signature using the asynchronous version
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Webhook event received: ${event.type}`);

    // Check for idempotency
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .single();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed`);
      return new Response(
        JSON.stringify({ received: true, message: 'Event already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object, supabase);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'invoice.paid':
        await handleSubscriptionUpdate(event.data.object, event.type, supabase);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Record the event as processed
    const { error: insertEventError } = await supabase
      .from('stripe_events')
      .insert({
        id: event.id,
        event_type: event.type,
      });

    if (insertEventError) {
      console.error('Error recording event:', insertEventError);
      throw insertEventError;
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: `Webhook Error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to handle checkout.session.completed events
async function handleCheckoutSessionCompleted(session, supabase) {
  console.log('Processing checkout.session.completed', session);

  if (!session.customer || !session.subscription) {
    console.log('Session missing customer or subscription ID');
    return;
  }

  try {
    // Fetch customer and subscription details
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const userId = session.client_reference_id;

    if (!userId) {
      console.error('No user ID found in client_reference_id');
      return;
    }

    console.log(`Found checkout completion for user ${userId}, subscription ${subscriptionId}`);

    // Fetch the subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Check if this subscription already exists to prevent duplicates
    const { data: existingSubscriptions, error: queryError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId);
      
    if (queryError) {
      throw queryError;
    }
    
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      console.log(`Subscription ${subscriptionId} already exists in the database. Updating status.`);
      
      // Update the existing subscription instead of creating a new one
      // IMPORTANT CHANGE: Always set admin_override to false when we have an active subscription from Stripe
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          trial_end_date: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000).toISOString() 
            : null,
          admin_override: false // Reset admin override to ensure payment takes priority
        })
        .eq('stripe_subscription_id', subscriptionId);
        
      if (updateError) {
        console.error('Error updating subscription:', updateError);
      }
      return;
    }

    // Create a new subscription record
    // NEW: Always create with admin_override set to false
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end_date: subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString() 
          : null,
        admin_override: false // Ensure payment takes priority over admin settings
      });

    if (insertError) {
      console.error('Error inserting subscription:', insertError);
      throw insertError;
    }

    console.log(`Subscription ${subscriptionId} created for user ${userId}`);
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
    throw error;
  }
}

// Helper function to handle subscription update events
async function handleSubscriptionUpdate(data, eventType, supabase) {
  console.log('Processing subscription update', data);

  try {
    const subscriptionId = data.id;
    const customerId = data.customer;
    
    // Extract user ID from metadata if available
    let userId = data.metadata?.user_id;
    
    // If no user ID in metadata, look it up from existing records
    if (!userId) {
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();
        
      if (existingSubscription) {
        userId = existingSubscription.user_id;
      } else {
        console.error('Cannot find user ID for subscription', subscriptionId);
        return;
      }
    }

    // Check if this subscription already exists
    const { data: existingSubscriptions, error: queryError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId);
      
    if (queryError) {
      throw queryError;
    }
    
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      console.log(`Updating existing subscription ${subscriptionId}`);
      
      // IMPORTANT CHANGE: If we're getting a paid/active subscription update from Stripe, 
      // we should prioritize it over any admin override
      const isPaymentConfirmation = 
        eventType === 'invoice.paid' || 
        (data.status === 'active' && eventType === 'customer.subscription.updated');
        
      // Update the existing subscription
      const updateData = {
        status: data.status,
        current_period_end: new Date(data.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        trial_end_date: data.trial_end 
          ? new Date(data.trial_end * 1000).toISOString() 
          : null
      };
      
      // Only reset admin_override when we have a payment confirmation
      if (isPaymentConfirmation) {
        updateData.admin_override = false;
        console.log('Payment confirmation received, resetting admin_override flag');
      }
      
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('stripe_subscription_id', subscriptionId);
        
      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }
    } else {
      console.log(`Creating new subscription record for ${subscriptionId}`);
      
      // Create a new subscription record - always with admin_override as false for new Stripe subscriptions
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: data.status,
          current_period_end: new Date(data.current_period_end * 1000).toISOString(),
          trial_end_date: data.trial_end 
            ? new Date(data.trial_end * 1000).toISOString() 
            : null,
          admin_override: false // Ensure Stripe has precedence for new subscriptions
        });

      if (insertError) {
        console.error('Error inserting subscription:', insertError);
        throw insertError;
      }
    }

    console.log(`Subscription ${subscriptionId} processed successfully`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

// Helper function to handle subscription deletion events
async function handleSubscriptionDeleted(subscription, supabase) {
  console.log('Processing subscription deletion', subscription);

  try {
    const subscriptionId = subscription.id;

    // Update the subscription status to canceled
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (error) {
      console.error('Error updating subscription to canceled:', error);
      throw error;
    }

    console.log(`Subscription ${subscriptionId} marked as canceled`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }
}
