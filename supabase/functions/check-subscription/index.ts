
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
    const userId = user.id;
    const email = user.email;
    console.log('Checking subscription for user:', userId, email);

    if (!email) {
      throw new Error('User email not found');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if user has valid subscription or is within trial period
    const { data: userSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    console.log('Subscription from DB:', userSubscription);

    // First, check if user is within free trial period (90 days from account creation)
    const userCreatedAt = new Date(user.created_at || Date.now());
    const trialEndDate = new Date(userCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 90); // 90-day trial
    
    const now = new Date();
    const isInTrialPeriod = now < trialEndDate;
    console.log('User created at:', userCreatedAt);
    console.log('Trial end date:', trialEndDate);
    console.log('Current time:', now);
    console.log('In trial period:', isInTrialPeriod);
    console.log('Trial days left:', Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // If user is in trial period, they have access
    if (isInTrialPeriod) {
      console.log('User is in trial period, granting access');
      return new Response(
        JSON.stringify({
          hasAccess: true,
          subscription: null,
          trialDaysLeft: Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          isInTrialPeriod: true,
          trialEndDate: trialEndDate.toISOString(),
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // If no subscription found, check if customer exists in Stripe
    if (subError || !userSubscription) {
      console.log('No subscription found in DB, checking Stripe directly');
      
      try {
        const customers = await stripe.customers.list({
          email: email,
          limit: 1,
        });
        console.log('Stripe customers found:', customers.data.length);

        if (customers.data.length === 0) {
          console.log('No Stripe customer found');
          return new Response(
            JSON.stringify({ 
              hasAccess: false,
              subscription: null,
              trialDaysLeft: 0,
              isInTrialPeriod: false,
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }

        const customerId = customers.data[0].id;
        console.log('Found Stripe customer:', customerId);
        
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        });
        console.log('Stripe subscriptions found:', subscriptions.data.length);

        if (subscriptions.data.length === 0) {
          console.log('No active subscriptions found in Stripe');
          return new Response(
            JSON.stringify({ 
              hasAccess: false,
              subscription: null,
              trialDaysLeft: 0,
              isInTrialPeriod: false,
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }

        // Found active subscription in Stripe but not in our DB - sync it
        const stripeSubscription = subscriptions.data[0];
        console.log('Found active subscription in Stripe, syncing to DB:', stripeSubscription.id);
        
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: stripeSubscription.id,
            status: stripeSubscription.status,
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          });

        if (insertError) {
          console.error('Error syncing subscription to database:', insertError);
        } else {
          console.log('Successfully synced subscription to DB');
        }

        return new Response(
          JSON.stringify({ 
            hasAccess: true,
            subscription: {
              id: stripeSubscription.id,
              status: stripeSubscription.status,
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            },
            trialDaysLeft: 0,
            isInTrialPeriod: false,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (checkError) {
        console.error('Error checking Stripe subscription:', checkError);
      }
      
      console.log('Defaulting to no access after Stripe checks failed');
      return new Response(
        JSON.stringify({ 
          hasAccess: false,
          subscription: null,
          trialDaysLeft: 0,
          isInTrialPeriod: false,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if stored subscription is still valid
    if (userSubscription.status === 'active' || userSubscription.status === 'trialing') {
      const currentPeriodEnd = new Date(userSubscription.current_period_end);
      const isValid = currentPeriodEnd > now;
      console.log('Subscription status:', userSubscription.status);
      console.log('Current period end:', currentPeriodEnd);
      console.log('Is subscription valid:', isValid);

      if (!isValid) {
        // Double-check with Stripe
        try {
          console.log('Subscription period ended, double-checking with Stripe');
          const stripeSubscription = await stripe.subscriptions.retrieve(
            userSubscription.stripe_subscription_id
          );
          console.log('Stripe subscription status:', stripeSubscription.status);

          if (stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing') {
            // Update our record
            console.log('Stripe reports subscription still active, updating DB');
            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update({
                status: stripeSubscription.status,
                current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              })
              .eq('id', userSubscription.id);

            if (updateError) {
              console.error('Error updating subscription record:', updateError);
            } else {
              console.log('Successfully updated subscription record');
            }

            return new Response(
              JSON.stringify({ 
                hasAccess: true,
                subscription: {
                  id: stripeSubscription.id,
                  status: stripeSubscription.status,
                  currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                },
                trialDaysLeft: 0,
                isInTrialPeriod: false,
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          } else {
            console.log('Stripe confirms subscription is inactive');
          }
        } catch (error) {
          console.error('Error fetching subscription from Stripe:', error);
        }

        return new Response(
          JSON.stringify({ 
            hasAccess: false,
            subscription: {
              id: userSubscription.stripe_subscription_id,
              status: 'inactive',
              currentPeriodEnd: userSubscription.current_period_end,
            },
            trialDaysLeft: 0,
            isInTrialPeriod: false,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          hasAccess: true,
          subscription: {
            id: userSubscription.stripe_subscription_id,
            status: userSubscription.status,
            currentPeriodEnd: userSubscription.current_period_end,
          },
          trialDaysLeft: 0,
          isInTrialPeriod: false,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        hasAccess: false,
        subscription: {
          id: userSubscription.stripe_subscription_id,
          status: userSubscription.status,
          currentPeriodEnd: userSubscription.current_period_end,
        },
        trialDaysLeft: 0,
        isInTrialPeriod: false,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
