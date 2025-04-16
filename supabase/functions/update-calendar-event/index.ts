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
    
    const { eventId, userId, jobData, testMode, testData } = await req.json();
    
    console.log(`Attempting to update event: ${eventId} for user: ${userId}`);
    
    if (!eventId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: eventId or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobData && !testData) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: jobData or testData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which data to use (test mode or real job data)
    const eventData = testMode && testData ? testData.event : jobData;
    console.log('Using event data:', JSON.stringify(eventData));

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
    
    // Create event object from job data
    let event;
    if (eventData.is_full_day === true) {
      // Format for all-day events
      event = {
        summary: eventData.title,
        location: eventData.location,
        description: eventData.description,
        start: {
          date: eventData.date,
          timeZone: 'UTC',
        },
        end: {
          date: eventData.date,
          timeZone: 'UTC',
        },
      };
      console.log('Created all-day event object for update');
    } else {
      // Format for specific time events
      const startTime = eventData.start_time || '09:00:00';
      const endTime = eventData.end_time || '17:00:00';
      
      // Ensure times include seconds
      const normalizedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
      const normalizedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;
      
      // Fixed: Format with correct timezone handling - DO NOT append Z (which forces UTC)
      const formattedStartDate = `${eventData.date}T${normalizedStartTime}`;
      const formattedEndDate = `${eventData.date}T${normalizedEndTime}`;
      
      event = {
        summary: eventData.title,
        location: eventData.location,
        description: eventData.description,
        start: {
          dateTime: formattedStartDate,
          timeZone: 'UTC', // Using UTC as the reference timezone
        },
        end: {
          dateTime: formattedEndDate,
          timeZone: 'UTC', // Using UTC as the reference timezone
        },
      };
      console.log('Created timed event object for update with normalized times');
    }
    
    console.log("Using access token:", accessToken ? "Token present" : "No token");
    console.log("Updating Google Calendar event with ID:", eventId);
    
    // Update event in Google Calendar
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );
    
    // Log the full response from Google Calendar API for debugging
    const responseText = await calendarResponse.text();
    console.log(`Google Calendar API response status: ${calendarResponse.status}`);
    console.log(`Google Calendar API response body: ${responseText}`);
    
    if (!calendarResponse.ok) {
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = { rawText: responseText };
      }
      
      console.error('Google Calendar API error:', errorDetails);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update calendar event', 
          details: errorDetails,
          status: calendarResponse.status
        }),
        { status: calendarResponse.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse the response as JSON
    let calendarData;
    try {
      calendarData = JSON.parse(responseText);
      console.log('Successfully updated event:', calendarData.id);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse Google Calendar response',
          rawResponse: responseText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event updated in calendar',
        eventId: calendarData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in update-calendar-event function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
