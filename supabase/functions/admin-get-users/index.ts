
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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authorization token');
    }

    const { data: userData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }
    
    if (!userData.is_admin) {
      throw new Error('Unauthorized: Admin privileges required');
    }

    // Fetch user profiles and subscription data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, created_at, is_admin');
      
    if (profilesError) {
      throw new Error('Failed to fetch user profiles');
    }

    // Fetch subscription information for each user
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*');
      
    if (subsError) {
      throw new Error('Failed to fetch subscription data');
    }

    // Combine user data with subscription data
    const users = profiles.map(profile => {
      const userSub = subscriptions.find(sub => sub.user_id === profile.id);
      
      return {
        id: profile.id,
        email: profile.email,
        isAdmin: profile.is_admin,
        createdAt: profile.created_at,
        status: userSub?.status || null,
        trialEndDate: userSub?.trial_end_date || null,
        isActive: !!userSub && ['active', 'trialing'].includes(userSub.status),
      };
    });

    return new Response(
      JSON.stringify({ 
        users,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Admin get users error:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      }
    );
  }
});
