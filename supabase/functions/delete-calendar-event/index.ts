
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://htjvyzmuqsrjpesdurni.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0anZ5em11cXNyanBlc2R1cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDg0NTIsImV4cCI6MjA1Njk4NDQ1Mn0.AtFzj0Ail1PgKmXJcPWyWnXqC6EbMP0UOlH4m_rhkq8';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Function to get a valid OAuth2 access token from the user's integration
async function getAccessToken(userId: string, supabase: any) {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials in environment variables:', {
        clientIdExists: Boolean(GOOGLE_CLIENT_ID),
        clientSecretExists: Boolean(GOOGLE_CLIENT_SECRET),
      });
      throw new Error('Missing Google OAuth2 credentials');
    }

    if (!userId) {
      throw new Error('User ID is required to access calendar integration');
    }

    console.log(`Looking for calendar integration for user: ${userId}`);

    const { data, error } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "google_calendar")
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching user integration:', error);
      throw new Error('Error fetching Google Calendar integration');
    }

    console.log('Query result:', { dataLength: data?.length, data });

    if (!data || data.length === 0) {
      console.error('No integration found for user:', userId);
      throw new Error('No Google Calendar integration found. Please connect your Google Calendar account first.');
    }

    const integrationData = data[0];

    if (!integrationData.refresh_token) {
      console.error('Found integration but missing refresh token for user:', userId);
      throw new Error('Invalid Google Calendar integration. Please reconnect your Google Calendar account.');
    }

    console.log('Retrieved integration data:', {
      integrationId: integrationData.id,
      hasAccessToken: Boolean(integrationData.access_token),
      hasRefreshToken: Boolean(integrationData.refresh_token),
      expiresAt: integrationData.expires_at,
      userId: integrationData.user_id
    });

    // Check if token needs refresh
    const expiresAt = new Date(integrationData.expires_at);
    const now = new Date();
    const expirationBuffer = 300000; // 5 minutes in milliseconds

    if (now.getTime() > expiresAt.getTime() - expirationBuffer) {
      // Token needs refresh
      console.log('Token expired, refreshing...');

      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: integrationData.refresh_token,
        grant_type: 'refresh_token'
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OAuth token refresh error:', errorData);
        throw new Error('Failed to refresh access token');
      }

      const tokenData = await response.json();

      // Update the token in the database
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);

      await supabase
        .from('user_integrations')
        .update({
          access_token: tokenData.access_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', integrationData.id);

      return tokenData.access_token;
    }

    // Current token is still valid
    console.log('Using existing valid token');
    return integrationData.access_token;

  } catch (error) {
    console.error('Error in getAccessToken:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract the authorization header for RLS to work
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', Boolean(authHeader));

    // Initialize Supabase client with auth header if available
    let supabase;
    if (authHeader) {
      // Create authenticated client using the user's JWT token
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: authHeader,
          }
        }
      });
      console.log('Created authenticated supabase client with user JWT');
    } else {
      // Fall back to service role key for admin operations
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log('Created supabase client with service role key');
    }

    // Authenticate the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated", details: userError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get request data
    const { eventId, jobId } = await req.json();
    
    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Missing event ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token for Google Calendar API
    const accessToken = await getAccessToken(user.id, supabase);
    
    // Delete event from Google Calendar
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    // Check for errors (DELETE request returns empty body on success with 204)
    if (!calendarResponse.ok) {
      let errorText = 'Failed to delete calendar event';
      try {
        const errorData = await calendarResponse.json();
        console.error('Google Calendar API error:', errorData);
        errorText = errorData.error?.message || errorText;
      } catch (e) {
        // If parsing fails, use status text
        errorText = calendarResponse.statusText;
      }
      
      return new Response(
        JSON.stringify({ error: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If jobId is provided, update the job to remove the calendar event ID
    if (jobId) {
      try {
        // Update the job to remove the calendar event ID
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ calendar_event_id: null })
          .eq('id', jobId);
        
        if (updateError) {
          console.error('Error updating job:', updateError);
          // Continue since the calendar event was deleted successfully
        } else {
          console.log('Successfully removed calendar event ID from job');
        }
      } catch (error) {
        console.error('Error updating job:', error);
        // Continue since the calendar event was deleted successfully
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event deleted from calendar'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in delete-calendar-event function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
