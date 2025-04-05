
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

    // Initialize Supabase client with anon key (RLS enforced)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Initialize Supabase client with service role key (bypasses RLS, for debugging)
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError);
      throw new Error('Invalid user token');
    }

    const user = userData.user;
    const userId = user.id;

    console.log(`Processing subscription cancellation for user: ${userId}`);
    console.log(`User auth.uid(): ${user.id}`);

    // Get the current active subscription for the user (with RLS)
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

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

    // Log the retrieved subscriptions for debugging
    console.log(`Found ${subscriptions?.length || 0} active subscriptions for user ${userId} (with RLS):`, subscriptions);

    // If no subscriptions found with RLS, check without RLS to debug
    if (!subscriptions || subscriptions.length === 0) {
      const { data: allSubscriptionsAdmin } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (allSubscriptionsAdmin && allSubscriptionsAdmin.length > 0) {
        console.log(`Found ${allSubscriptionsAdmin.length} subscriptions for user ${userId} (without RLS):`, allSubscriptionsAdmin);
        return new Response(
          JSON.stringify({ error: 'Subscription exists but RLS prevented access. User ID mismatch detected.' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      // Check if there are any subscriptions at all (regardless of status)
      const { data: allSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (allSubscriptions && allSubscriptions.length > 0) {
        console.log(`No active subscriptions found, but user has ${allSubscriptions.length} subscriptions with statuses:`, allSubscriptions.map(sub => sub.status));
        return new Response(
          JSON.stringify({ error: 'No active subscription found to cancel' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // If no subscriptions exist, check Stripe directly
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      if (profile?.stripe_customer_id) {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
          apiVersion: '2023-10-16',
        });

        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active',
        });

        if (stripeSubscriptions.data.length > 0) {
          console.log(`Found ${stripeSubscriptions.data.length} active subscriptions in Stripe for user ${userId}, but not in database`);
          return new Response(
            JSON.stringify({ error: 'Active subscription found in Stripe but not in database. Please contact support.' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }

      console.log('No subscriptions found for user:', userId);
      return new Response(
        JSON.stringify({ error: 'No subscription found to cancel' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Select the most recent active subscription
    const subscription = subscriptions[0];
    console.log('Selected subscription for cancellation:', subscription);

    const stripeSubscriptionId = subscription.stripe_subscription_id;

    // Check if the subscription is already canceled
    if (subscription.status === 'canceled') {
      console.log(`Subscription ${stripeSubscriptionId} is already canceled`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subscription is already canceled',
          cancelDate: subscription.updated_at,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle manual subscriptions
    if (stripeSubscriptionId === 'manual') {
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating manual subscription:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Trial subscription canceled successfully',
          cancelDate: new Date().toISOString(),
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // For Stripe subscriptions, cancel in Stripe
    try {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
        apiVersion: '2023-10-16',
      });

      console.log(`Attempting to cancel Stripe subscription: ${stripeSubscriptionId}`);
      // Cancel at the end of the billing period (optional, set to false for immediate cancellation)
      const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId, {
        at_period_end: true, // Set to false for immediate cancellation
      });
      console.log('Stripe subscription canceled successfully');

      // Update the subscription status in the database
      const status = canceledSubscription.cancel_at_period_end ? 'active' : 'canceled';
      const cancelDate = canceledSubscription.cancel_at
        ? new Date(canceledSubscription.cancel_at * 1000).toISOString()
        : new Date().toISOString();

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: status, // Keep as 'active' if canceling at period end
          updated_at: new Date().toISOString(),
          cancel_at: canceledSubscription.cancel_at
            ? new Date(canceledSubscription.cancel_at * 1000).toISOString()
            : null,
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: canceledSubscription.cancel_at_period_end
            ? 'Subscription will be canceled at the end of the billing period'
            : 'Subscription canceled successfully',
          cancelDate: cancelDate,
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
