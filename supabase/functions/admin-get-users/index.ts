
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
      
      // Check if user is an admin
      const isAdmin = user.user_metadata?.is_admin === true;
      if (!isAdmin) {
        console.log('User is not an admin:', user.id);
        return new Response(
          JSON.stringify({ error: 'Access denied. Admin privileges required.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Admin user verified:', user.id);
      
      // Fetch detailed user profiles including auth data
      console.log('Fetching users from profiles table and auth.users');
      
      // Get basic profile data from public.profiles
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
      
      // Get detailed user data for each profile (we need the admin key to access auth.users)
      const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
      
      if (authUsersError) {
        console.error('Error fetching auth users:', authUsersError.message);
        return new Response(
          JSON.stringify({ error: `Error fetching auth users: ${authUsersError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Combine the data for a complete view
      const combinedUsers = authUsers.users.map(authUser => {
        // Find matching profile if it exists
        const matchingProfile = profiles.find(profile => profile.id === authUser.id) || {};
        
        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          is_admin: matchingProfile.is_admin || authUser.user_metadata?.is_admin || false,
          profile: matchingProfile
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
