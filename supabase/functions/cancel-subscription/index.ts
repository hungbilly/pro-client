
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@15.12.0?dts';
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
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError);
      throw new Error('Invalid user token');
    }

    const user = userData.user;
    const userId = user.id;

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get the current subscription for the user
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (subError) {
      console.error('Error getting subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve subscription information' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Check if subscription exists
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscription found for user:', userId);
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const subscription = subscriptions[0];
    const stripeSubscriptionId = subscription.stripe_subscription_id;

    // Check if it's a real Stripe subscription or a manual one
    if (stripeSubscriptionId === 'manual') {
      // For manual subscriptions, just update the status in the database
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Trial subscription canceled successfully' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // For Stripe subscriptions, cancel it in Stripe
    try {
      const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
      
      // Update the subscription status in our database
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subscription canceled successfully',
          cancelDate: canceledSubscription.cancel_at 
            ? new Date(canceledSubscription.cancel_at * 1000).toISOString() 
            : null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (stripeError) {
      console.error('Error canceling subscription in Stripe:', stripeError);
      return new Response(
        JSON.stringify({ error: 'Failed to cancel subscription in Stripe' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
