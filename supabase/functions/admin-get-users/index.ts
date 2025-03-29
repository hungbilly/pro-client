
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    console.log('Admin Get Users function called');
    
    // Create a Supabase client with the Admin key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify that the request is coming from an admin user
    try {
      // Get user from token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.log('Invalid authentication token', userError);
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if user is an admin by getting their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.log('Error fetching user profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'Error fetching user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const isAdmin = profile?.is_admin === true;
      if (!isAdmin) {
        console.log('User is not an admin:', user.id);
        return new Response(
          JSON.stringify({ error: 'Access denied. Admin privileges required.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Admin user verified:', user.id);
      
      // Fetch user data from profiles table only
      console.log('Fetching users from profiles table');
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError.message);
        return new Response(
          JSON.stringify({ error: `Error fetching profiles: ${profilesError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For each profile, get subscription information if available
      console.log('Fetching subscription information');
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*');
      
      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError.message);
        return new Response(
          JSON.stringify({ error: `Error fetching subscriptions: ${subscriptionsError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Combine profiles with subscription data
      const combinedUsers = profiles.map(profile => {
        // Find matching subscription if it exists
        const subscription = subscriptions?.find(sub => sub.user_id === profile.id);
        
        return {
          id: profile.id,
          email: profile.email,
          created_at: profile.created_at,
          last_sign_in_at: profile.last_sign_in_at,
          is_admin: profile.is_admin,
          subscription: subscription ? {
            id: subscription.id,
            status: subscription.status,
            stripe_subscription_id: subscription.stripe_subscription_id,
            stripe_customer_id: subscription.stripe_customer_id,
            current_period_end: subscription.current_period_end,
            trial_end_date: subscription.trial_end_date,
            created_at: subscription.created_at
          } : null
        };
      });
      
      console.log(`Successfully fetched ${combinedUsers.length} users`);
      
      // Return the users
      return new Response(
        JSON.stringify({ users: combinedUsers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (error) {
      console.error('Error verifying admin user:', error.message);
      return new Response(
        JSON.stringify({ error: `Error verifying admin user: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Unexpected error in admin-get-users function:', error.message);
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
