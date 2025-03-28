
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
    console.log('User authenticated:', user.id, email);

    if (!email) {
      throw new Error('User email not found');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get or create customer
    let customerId;
    const { data: subscriptionData, error: subError } = await supabase.functions.invoke('check-subscription', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log('Subscription check result:', JSON.stringify(subscriptionData));

    // First, check if user already has an active subscription
    try {
      // Search for stripe customer by email
      const stripeCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });
      console.log('Found Stripe customers:', stripeCustomers.data.length);

      if (stripeCustomers && stripeCustomers.data && stripeCustomers.data.length > 0) {
        customerId = stripeCustomers.data[0].id;
        console.log('Using existing Stripe customer:', customerId);
        
        // Check if customer already has an active subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        });
        
        console.log('Active subscriptions found:', subscriptions.data.length);
        
        if (subscriptions.data && subscriptions.data.length > 0) {
          console.log('User already has active subscription:', subscriptions.data[0].id);
          
          // Store subscription in our database if not already there
          const { data: existingSub, error: checkError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('stripe_subscription_id', subscriptions.data[0].id)
            .maybeSingle();
            
          console.log('Existing subscription in DB:', existingSub, 'Error:', checkError);
          
          if (!existingSub) {
            console.log('Storing subscription in database');
            const { error: insertError } = await supabase
              .from('user_subscriptions')
              .insert({
                user_id: user.id,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptions.data[0].id,
                status: subscriptions.data[0].status,
                current_period_end: new Date(subscriptions.data[0].current_period_end * 1000).toISOString(),
              });
              
            if (insertError) {
              console.error('Error storing subscription in database:', insertError);
            }
          }
          
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
    if (!customerId) {
      try {
        console.log('Creating new Stripe customer');
        const newCustomer = await stripe.customers.create({
          email: email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = newCustomer.id;
        console.log('Created new customer:', customerId);
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
      console.log('Request body parsed, withTrial:', withTrial);
    } catch (error) {
      console.log('No request body or invalid JSON, defaulting to trial=true');
    }
    
    console.log('Creating checkout session with trial:', withTrial);
    
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
              description: 'Unlock all features of the photography business management platform - HK$50 per month',
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
      metadata: {
        plan_name: 'Premium Photography HKD',
        price_amount: '50',
        price_currency: 'HKD',
        supabase_user_id: user.id
      }
    });

    console.log('Checkout session created:', session.id);

    // Store subscription info in Supabase
    if (session.id) {
      console.log('Storing session in database');
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
