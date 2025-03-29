
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

    // Get the request body
    const requestData = await req.json();
    const { withTrial = true, productId } = requestData;

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
    const email = user.email;

    if (!email) {
      throw new Error('User email not found');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if user already has an active subscription
    const { data: existingSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!subError && existingSubscription) {
      return new Response(
        JSON.stringify({ 
          alreadySubscribed: true,
          message: 'User already has an active subscription' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get or create customer
    let customerId;
    
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create a new customer
      const newCustomer = await stripe.customers.create({
        email: email,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = newCustomer.id;
    }

    // Determine the price ID based on whether trial is requested
    // Use the productId if provided
    let defaultPriceId = 'price_1R7pXrDHpTYL9aMbsXZNAntx'; // Default price ID
    
    if (productId) {
      // If productId is provided, find the associated price
      try {
        const prices = await stripe.prices.list({
          product: productId,
          active: true,
          limit: 1,
        });
        
        if (prices.data.length > 0) {
          defaultPriceId = prices.data[0].id;
          console.log(`Found price for product ${productId}: ${defaultPriceId}`);
        }
      } catch (error) {
        console.error(`Error finding price for product ${productId}:`, error);
        // Continue with default price if there's an error
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: defaultPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
      client_reference_id: userId,
      subscription_data: withTrial ? {
        trial_period_days: 30, // Add a 30-day trial if requested
      } : {},
      metadata: {
        supabase_user_id: userId,
      },
    });

    // Save session information to database
    const { error: insertError } = await supabase
      .from('subscription_sessions')
      .insert({
        user_id: userId,
        session_id: session.id,
        status: 'created',
      });

    if (insertError) {
      console.error('Error saving subscription session:', insertError);
      // Continue even if there's an error saving the session
    }

    return new Response(
      JSON.stringify({ url: session.url }),
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
