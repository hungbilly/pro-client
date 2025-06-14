
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

    // Initialize Supabase client with SERVICE ROLE KEY (not anon key) to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError);
      throw new Error('Invalid user token');
    }

    const user = userData.user;
    const userId = user.id;
    
    // Check profiles table to see if user exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();
      
    let email;
    
    if (profileError) {
      console.error('Error getting profile:', profileError);
      // Don't throw an error, just proceed with the email from auth user
      email = user.email;
    } else if (!profileData) {
      console.log('User profile not found, creating one');
      // Create a profile record if it doesn't exist
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user.email,
          is_admin: user.user_metadata?.is_admin || false,
          created_at: user.created_at
        });
        
      if (insertError) {
        console.error('Error creating profile:', insertError);
        // Still continue with the email from auth user
      }
      
      email = user.email;
    } else {
      email = profileData.email || user.email;
    }

    if (!email) {
      throw new Error('User email not found');
    }

    console.log(`Checking subscription for user: ${userId} (${email})`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check for subscription in our database first
    const { data: userSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('Local subscription data:', userSubscription);

    // If we have a valid subscription in our database
    if (!subError && userSubscription) {
      console.log(`User ${userId} has subscription record in database with status: ${userSubscription.status}`);
      
      // Check if this is an admin override
      if (userSubscription.admin_override) {
        console.log(`User ${userId} has an admin override for subscription status`);
        
        // Return the status based on the admin override
        return new Response(
          JSON.stringify({
            hasAccess: userSubscription.status === 'active' || userSubscription.status === 'trialing',
            subscription: {
              id: userSubscription.stripe_subscription_id,
              status: userSubscription.status,
              currentPeriodEnd: userSubscription.current_period_end,
            },
            trialDaysLeft: userSubscription.trial_end_date ? 
              Math.ceil((new Date(userSubscription.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0,
            isInTrialPeriod: userSubscription.status === 'trialing',
            trialEndDate: userSubscription.trial_end_date,
            adminOverride: true,
            local: true,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
      // Check if active subscription has expired
      if (userSubscription.status === 'active' && userSubscription.current_period_end) {
        const now = new Date();
        const periodEnd = new Date(userSubscription.current_period_end);
        const isExpired = now > periodEnd;

        if (isExpired) {
          console.log(`User ${userId} active subscription has expired on ${periodEnd.toISOString()}, setting status to inactive`);
          
          // Update the status in the database to 'inactive'
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({ status: 'inactive' })
            .eq('id', userSubscription.id);
            
          if (updateError) {
            console.error('Error updating expired active subscription to inactive:', updateError);
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
              trialEndDate: null,
              local: true,
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
      }
      
      // If the status is active and not expired, user has access
      if (userSubscription.status === 'active') {
        console.log(`User ${userId} has active subscription in database`);
        
        // Make sure to set trial related fields to null/0 for active subscriptions
        // This ensures we don't have mixed signals in the frontend
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            trial_end_date: null, // Explicitly set to null for active subscriptions
          })
          .eq('id', userSubscription.id)
          .eq('status', 'active'); // Only update active subscriptions
          
        if (updateError) {
          console.error('Error updating subscription trial_end_date:', updateError);
        } else {
          console.log('Updated active subscription to have null trial_end_date');
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
            trialEndDate: null,
            local: true,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else if (userSubscription.status === 'trialing') {
        console.log(`User ${userId} has trial subscription in database`);
        
        // Add validation for expired trial
        if (userSubscription.trial_end_date) {
          const now = new Date();
          const trialEnd = new Date(userSubscription.trial_end_date);
          const isTrialExpired = now > trialEnd;

          // If trial has expired, update to inactive and return no access
          if (isTrialExpired) {
            console.log(`User ${userId} trial has expired on ${trialEnd.toISOString()}, setting status to inactive`);
            
            // Update the status in the database to 'inactive'
            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update({ status: 'inactive' })
              .eq('id', userSubscription.id);
              
            if (updateError) {
              console.error('Error updating expired subscription to inactive:', updateError);
            }
            
            return new Response(
              JSON.stringify({
                hasAccess: false,
                subscription: {
                  id: userSubscription.stripe_subscription_id,
                  status: 'inactive', // Change status to inactive
                  currentPeriodEnd: userSubscription.current_period_end,
                },
                trialDaysLeft: 0,
                isInTrialPeriod: false,
                trialEndDate: userSubscription.trial_end_date,
                local: true,
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          }
        }
        
        // If trial is still valid, continue with normal flow
        return new Response(
          JSON.stringify({
            hasAccess: true,
            subscription: {
              id: userSubscription.stripe_subscription_id,
              status: userSubscription.status,
              currentPeriodEnd: userSubscription.current_period_end,
            },
            trialDaysLeft: userSubscription.trial_end_date ? 
              Math.ceil((new Date(userSubscription.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0,
            isInTrialPeriod: true,
            trialEndDate: userSubscription.trial_end_date,
            local: true,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // Get trial days setting from admin_settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('admin_settings')
      .select('default_trial_days')
      .limit(1)
      .single();
    
    let trialDays = 90; // Default fallback value
    if (!settingsError && settingsData) {
      trialDays = settingsData.default_trial_days;
      console.log(`Using trial period from admin_settings: ${trialDays} days`);
    } else {
      console.log(`Could not fetch trial days from settings, using default: ${trialDays} days`);
      if (settingsError) {
        console.error('Error fetching trial days:', settingsError);
      }
    }

    // First, check if user is within free trial period based on admin settings
    const userCreatedAt = new Date(user.created_at || Date.now());
    const trialEndDate = new Date(userCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + trialDays); // Use dynamic trial days
    
    const now = new Date();
    const isInTrialPeriod = trialDays > 0 && now < trialEndDate;
    
    // If user is in trial period, they have access
    if (isInTrialPeriod) {
      console.log(`User ${userId} is in trial period until ${trialEndDate}, trial days: ${trialDays}`);
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
    } else if (trialDays <= 0) {
      console.log(`Trial period is disabled (${trialDays} days), user has no access`);
    }

    // Check Stripe for customer
    console.log('Checking Stripe for customer with email:', email);
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log('No customer found in Stripe for email:', email);
      // No customer in Stripe means no subscription
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
    console.log('Found Stripe customer ID:', customerId);
    
    console.log('Checking for active subscriptions for customer ID:', customerId);
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100, // Get all active subscriptions
    });

    console.log(`Found ${subscriptions.data.length} active subscriptions for customer`);

    if (subscriptions.data.length === 0) {
      // No active subscriptions in Stripe
      // If we have a record in our database, update it to inactive
      if (!subError && userSubscription) {
        console.log('Updating subscription record to inactive in database');
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'inactive',
          })
          .eq('id', userSubscription.id);
      }

      return new Response(
        JSON.stringify({ 
          hasAccess: false,
          subscription: userSubscription ? {
            id: userSubscription.stripe_subscription_id,
            status: 'inactive',
            currentPeriodEnd: userSubscription.current_period_end,
          } : null,
          trialDaysLeft: 0,
          isInTrialPeriod: false,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Sort subscriptions by created date, newest first
    const sortedSubscriptions = [...subscriptions.data].sort((a, b) => 
      b.created > a.created ? 1 : -1
    );
    
    // Get the most recent active subscription
    const activeSubscription = sortedSubscriptions[0];
    console.log('Most recent active subscription:', {
      id: activeSubscription.id,
      status: activeSubscription.status,
      current_period_end: activeSubscription.current_period_end,
    });

    // Additional validation: Check if the Stripe subscription has actually expired
    const stripeSubscriptionEndDate = new Date(activeSubscription.current_period_end * 1000);
    const isStripeSubscriptionExpired = now > stripeSubscriptionEndDate;
    
    if (isStripeSubscriptionExpired) {
      console.log(`Stripe subscription ${activeSubscription.id} has expired on ${stripeSubscriptionEndDate.toISOString()}`);
      
      // Update our database to reflect the expired status
      if (!subError && userSubscription) {
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'inactive',
          })
          .eq('id', userSubscription.id);
      }
      
      return new Response(
        JSON.stringify({ 
          hasAccess: false,
          subscription: {
            id: activeSubscription.id,
            status: 'inactive',
            currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000).toISOString(),
          },
          trialDaysLeft: 0,
          isInTrialPeriod: false,
          stripeData: {
            customerId,
            subscriptionId: activeSubscription.id,
          },
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Found active subscription in Stripe but not in our DB (or status mismatch) - sync it
    if (subError || !userSubscription || userSubscription.status !== activeSubscription.status) {
      console.log('Syncing subscription from Stripe to database');
      
      const subscriptionData = {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSubscription.id,
        status: activeSubscription.status,
        current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        trial_end_date: null, // Important: Set to null for active subscriptions
      };
      
      if (!userSubscription) {
        // Insert new record
        console.log('Inserting new subscription record');
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert(subscriptionData);

        if (insertError) {
          console.error('Error inserting subscription record:', insertError);
        }
      } else {
        // Update existing record
        console.log('Updating existing subscription record');
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update(subscriptionData)
          .eq('id', userSubscription.id);

        if (updateError) {
          console.error('Error updating subscription record:', updateError);
        }
      }
    }

    // For active subscriptions in Stripe, ensure trial mode is explicitly disabled
    if (activeSubscription && activeSubscription.status === 'active') {
      return new Response(
        JSON.stringify({ 
          hasAccess: true,
          subscription: {
            id: activeSubscription.id,
            status: activeSubscription.status,
            currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000).toISOString(),
          },
          trialDaysLeft: 0,
          isInTrialPeriod: false,
          trialEndDate: null,
          stripeData: {
            customerId,
            subscriptionId: activeSubscription.id,
          },
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
          id: activeSubscription.id,
          status: activeSubscription.status,
          currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        },
        trialDaysLeft: 0,
        isInTrialPeriod: activeSubscription.status === 'trialing',
        stripeData: {
          customerId,
          subscriptionId: activeSubscription.id,
        },
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
