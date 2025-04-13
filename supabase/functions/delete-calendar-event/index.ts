
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Function to get a valid OAuth2 access token from the user's integration
async function getAccessTokenForUser(userId: string, authHeader: string | null) {
  // Create client with user's JWT if available, otherwise use service role key
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

  // Get the user's Google Calendar integration
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single();
  
  if (error || !data) {
    console.error("No integration found:", error);
    throw new Error('No Google Calendar integration found for this user');
  }
  
  // Check if token needs refresh
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  
  // Add buffer of 5 minutes to ensure token doesn't expire during use
  const expirationBuffer = 300000; // 5 minutes in milliseconds
  
  if (now.getTime() > expiresAt.getTime() - expirationBuffer) {
    // Token needs refresh
    console.log("Token expired, needs refresh");
    if (!data.refresh_token) {
      throw new Error('No refresh token available');
    }
    
    // Refresh the token
    const refreshParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token'
    });
    
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: refreshParams.toString(),
    });
    
    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      console.error("Token refresh failed:", errorData);
      throw new Error(`Failed to refresh access token: ${JSON.stringify(errorData)}`);
    }
    
    const refreshData = await refreshResponse.json();
    
    // Update token in the database
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);
    
    await supabase
      .from('user_integrations')
      .update({
        access_token: refreshData.access_token,
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', data.id);
    
    return refreshData.access_token;
  }
  
  // Current token is still valid
  console.log("Using existing valid token");
  return data.access_token;
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
    
    const { eventId, userId } = await req.json();
    
    console.log(`Attempting to delete event: ${eventId} for user: ${userId}`);
    
    if (!eventId || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters', 
          details: { 
            eventId: Boolean(eventId), 
            userId: Boolean(userId) 
          } 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token for the user
    let accessToken;
    try {
      accessToken = await getAccessTokenForUser(userId, authHeader);
      console.log('Successfully acquired access token');
    } catch (error: any) {
      console.error('Error getting access token:', error.message);
      return new Response(
        JSON.stringify({ error: 'Authentication error', message: error.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Delete event from Google Calendar
    console.log("Using access token:", accessToken ? "Token present" : "No token");
    console.log("Deleting Google Calendar event with ID:", eventId);
    
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
      let errorDetails = { status: calendarResponse.status };
      
      try {
        const errorData = await calendarResponse.text();
        console.error('Google Calendar API error:', errorData);
        
        try {
          errorDetails = JSON.parse(errorData);
        } catch (e) {
          errorDetails = { ...errorDetails, rawText: errorData };
        }
      } catch (e) {
        // If parsing fails, use status text
        errorText = calendarResponse.statusText;
      }
      
      return new Response(
        JSON.stringify({ error: errorText, details: errorDetails }),
        { status: calendarResponse.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
