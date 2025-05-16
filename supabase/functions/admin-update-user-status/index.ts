
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
      console.error('Missing Authorization header in request');
      throw new Error('Missing Authorization header');
    }

    // Extract the token from the header
    const token = authHeader.replace('Bearer ', '');
    if (!token || token === 'null' || token === 'undefined') {
      console.error(`Invalid token received: "${token}"`);
      throw new Error('Invalid authentication token');
    }

    // Initialize Supabase client with SERVICE ROLE KEY to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase configuration environment variables');
      throw new Error('Server configuration error');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get admin user from token
    console.log(`Validating admin user with token: ${token.substring(0, 10)}...`);
    const { data: adminData, error: adminError } = await supabase.auth.getUser(token);
    
    if (adminError) {
      console.error('Error getting admin user:', adminError);
      throw new Error(`Invalid admin token: ${adminError.message}`);
    }

    if (!adminData || !adminData.user) {
      console.error('No user found in admin token data');
      throw new Error('Invalid admin token: No user found');
    }

    const adminUser = adminData.user;
    console.log(`Admin user authenticated: ${adminUser.email} (${adminUser.id})`);
    
    // Verify that the requesting user is an admin
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();
      
    if (adminProfileError) {
      console.error('Admin verification query error:', adminProfileError);
      throw new Error(`Admin verification failed: ${adminProfileError.message}`);
    }
    
    if (!adminProfile || !adminProfile.is_admin) {
      console.error('User is not an admin:', adminUser.email);
      throw new Error('User is not an admin');
    }

    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      throw new Error('Invalid request body format');
    }
    
    const { 
      userId,
      status,
      trialEndDate,
      notes,
      adminOverride = true // Default to true if not provided
    } = requestData;
    
    if (!userId || !status) {
      console.error('Missing required fields in request data:', { userId, status });
      throw new Error('Missing required fields: userId and status');
    }
    
    console.log(`Admin ${adminUser.email} updating status for user ${userId} to ${status}, admin_override=${adminOverride}`);

    // Get current subscription data to store in history
    const { data: currentSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    let previousStatus = null;
    let previousTrialEndDate = null;
      
    if (!subError && currentSubscription) {
      previousStatus = currentSubscription.status;
      previousTrialEndDate = currentSubscription.trial_end_date;
      
      console.log(`Previous subscription state: status=${previousStatus}, trial_end=${previousTrialEndDate}, admin_override=${currentSubscription.admin_override}`);
    }
    
    // Update or create subscription record
    let subscriptionData = {
      status: status,
      admin_override: adminOverride,
      override_notes: notes,
      override_by: adminUser.id,
      override_at: new Date().toISOString()
    };
    
    // Add trial end date if provided
    if (trialEndDate) {
      subscriptionData = { ...subscriptionData, trial_end_date: trialEndDate };
    }
    
    let result;
    
    if (!currentSubscription) {
      // If no subscription exists, create one
      console.log('Creating new subscription record with admin override:', adminOverride);
      
      const { data: newSub, error: createError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          stripe_customer_id: 'admin_override',
          stripe_subscription_id: 'admin_override',
          current_period_end: trialEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          ...subscriptionData
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating subscription:', createError);
        throw new Error(`Failed to create subscription: ${createError.message}`);
      }
      
      result = newSub;
    } else {
      // Update existing subscription
      console.log('Updating existing subscription with admin override:', adminOverride);
      
      const { data: updatedSub, error: updateError } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('id', currentSubscription.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }
      
      result = updatedSub;
    }
    
    // Record change in history table
    const { error: historyError } = await supabase
      .from('user_subscription_history')
      .insert({
        user_id: userId,
        admin_id: adminUser.id,
        previous_status: previousStatus,
        new_status: status,
        previous_trial_end_date: previousTrialEndDate,
        new_trial_end_date: trialEndDate || null,
        notes: notes
      });
      
    if (historyError) {
      console.error('Error recording subscription history:', historyError);
      // Don't throw error here, just log it - we still want to return the updated subscription
    } else {
      console.log('Successfully recorded subscription change in history');
    }
    
    // Return the updated subscription data
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscription status updated successfully',
        subscription: result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error updating user status:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        message: `Update failed: ${error.message}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
