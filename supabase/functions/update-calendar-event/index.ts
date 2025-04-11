
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

// Function to get a valid OAuth2 access token from the user's integration
async function getAccessTokenForUser(userId: string, supabase: any) {
  // Get the user's Google Calendar integration
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single();
  
  if (error || !data) {
    throw new Error('No Google Calendar integration found for this user');
  }
  
  // Check if token needs refresh
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  
  // Add buffer of 5 minutes to ensure token doesn't expire during use
  const expirationBuffer = 300000; // 5 minutes in milliseconds
  
  if (now.getTime() > expiresAt.getTime() - expirationBuffer) {
    // Token needs refresh
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
      throw new Error('Failed to refresh access token');
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
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, userId, jobData } = await req.json();
    
    if (!eventId || !userId || !jobData) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get access token for the user
    let accessToken;
    try {
      accessToken = await getAccessTokenForUser(userId, supabase);
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: 'Authentication error', message: error.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create event object from job data
    let event;
    if (jobData.is_full_day === true) {
      // Format for all-day events
      event = {
        summary: jobData.title,
        location: jobData.location,
        description: jobData.description,
        start: {
          date: jobData.date,
          timeZone: 'UTC',
        },
        end: {
          date: jobData.date,
          timeZone: 'UTC',
        },
      };
    } else {
      // Format for specific time events
      const startTime = jobData.start_time || '09:00:00';
      const endTime = jobData.end_time || '17:00:00';
      const formattedStartDate = `${jobData.date}T${startTime}`;
      const formattedEndDate = `${jobData.date}T${endTime}`;
      
      event = {
        summary: jobData.title,
        location: jobData.location,
        description: jobData.description,
        start: {
          dateTime: formattedStartDate,
          timeZone: 'UTC',
        },
        end: {
          dateTime: formattedEndDate,
          timeZone: 'UTC',
        },
      };
    }
    
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
    
    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json();
      console.error('Google Calendar API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to update calendar event', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const calendarData = await calendarResponse.json();
    
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
