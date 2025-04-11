
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const GOOGLE_REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://htjvyzmuqsrjpesdurni.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0anZ5em11cXNyanBlc2R1cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDg0NTIsImV4cCI6MjA1Njk4NDQ1Mn0.AtFzj0Ail1PgKmXJcPWyWnXqC6EbMP0UOlH4m_rhkq8';

// Function to get a valid OAuth2 access token using refresh token
async function getAccessToken() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing Google OAuth2 credentials');
  }
  
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
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
    console.error('OAuth token error:', errorData);
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request data
    const { eventId, testMode, testData } = await req.json();
    
    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    let eventData, clientData;
    
    if (testMode && testData) {
      // Use provided test data
      eventData = testData.event;
      clientData = testData.client;
    } else {
      // Fetch real data from database
      // ... (code to fetch event and client data)
      // This would normally include database queries based on your schema
    }

    if (!eventData || !clientData) {
      return new Response(
        JSON.stringify({ error: 'Failed to get event or client data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine event details
    const eventDate = eventData.date;
    const eventSummary = `${eventData.title} - ${clientData.name}`;
    const eventLocation = eventData.location || clientData.address;
    const eventDescription = `${eventData.description || 'Event'} for ${clientData.name}.\n\nClient Contact:\nEmail: ${clientData.email}\nPhone: ${clientData.phone}`;
    
    // Create event object
    let event;
    if (eventData.isFullDay === true) {
      // Format for all-day events
      event = {
        summary: eventSummary,
        location: eventLocation,
        description: eventDescription,
        start: {
          date: eventDate,
          timeZone: 'UTC',
        },
        end: {
          date: eventDate, // Same day end for a single day event
          timeZone: 'UTC',
        },
      };
    } else {
      // Format for specific time events
      const startTime = eventData.startTime || '09:00:00';
      const endTime = eventData.endTime || '17:00:00';
      const formattedStartDate = `${eventDate}T${startTime}-00:00`;
      const formattedEndDate = `${eventDate}T${endTime}-00:00`;
      
      event = {
        summary: eventSummary,
        location: eventLocation,
        description: eventDescription,
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
    
    // Get access token for Google Calendar API
    const accessToken = await getAccessToken();
    
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
