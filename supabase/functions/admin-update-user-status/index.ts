
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
      throw new Error('Missing Authorization header');
    }

    // Initialize Supabase client with SERVICE ROLE KEY to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get admin user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: adminData, error: adminError } = await supabase.auth.getUser(token);
    
    if (adminError || !adminData.user) {
      console.error('Error getting admin user:', adminError);
      throw new Error('Invalid admin token');
    }

    const adminUser = adminData.user;
    
    // Verify that the requesting user is an admin
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();
      
    if (adminProfileError || !adminProfile || !adminProfile.is_admin) {
      console.error('Admin verification failed:', adminProfileError);
      throw new Error('User is not an admin');
    }

    // Parse request body
    const requestData = await req.json();
    const { 
      userId,
      status,
      trialEndDate,
      notes,
      adminOverride = true // Default to true if not provided
    } = requestData;
    
    if (!userId || !status) {
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
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
