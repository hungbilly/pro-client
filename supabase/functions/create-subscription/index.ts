
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
    const email = user.email;

    if (!email) {
      throw new Error('User email not found');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get or create customer
    let customerId;
    const { data: customers, error: customerFetchError } = await supabase.functions.invoke('check-subscription', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Check if the customer exists in the response from check-subscription
    let existingCustomer = false;
    try {
      // Search for stripe customer by email
      const stripeCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (stripeCustomers && stripeCustomers.data && stripeCustomers.data.length > 0) {
        customerId = stripeCustomers.data[0].id;
        existingCustomer = true;
        
        // Check if customer already has an active subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        });
        
        if (subscriptions.data && subscriptions.data.length > 0) {
          return new Response(
            JSON.stringify({ 
              message: 'User already has an active subscription',
              url: null,
              subscriptionId: subscriptions.data[0].id,
              alreadySubscribed: true
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
      }
    } catch (error) {
      console.error('Error checking Stripe customer:', error);
      // Continue to create a new customer if there was an error
    }

    // Create a new customer if one doesn't exist
    if (!existingCustomer) {
      try {
        const newCustomer = await stripe.customers.create({
          email: email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = newCustomer.id;
      } catch (error) {
        console.error('Error creating Stripe customer:', error);
        throw new Error('Failed to create Stripe customer');
      }
    }

    if (!customerId) {
      throw new Error('Failed to get or create customer ID');
    }

    // Parse request body to get trial flag
    let withTrial = true;
    try {
      const requestBody = await req.json();
      withTrial = requestBody.withTrial !== false; // Default to true unless explicitly set to false
    } catch (error) {
      console.log('No request body or invalid JSON, defaulting to trial=true');
    }
    
    // Create a subscription session with a 3-month trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'hkd',
            product_data: {
              name: 'Premium Photography Business Management',
              description: 'Unlock all features of the photography business management platform',
            },
            unit_amount: 5000, // 50 HKD per month
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
      subscription_data: withTrial ? {
        trial_period_days: 90, // 3-month free trial
      } : undefined,
    });

    // Store subscription info in Supabase
    if (session.id) {
      const { error: insertError } = await supabase
        .from('subscription_sessions')
        .insert({
          user_id: user.id,
          session_id: session.id,
          status: 'created',
        });

      if (insertError) {
        console.error('Error storing subscription session:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
