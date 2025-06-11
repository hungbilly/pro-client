
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function getAccessTokenForUser(userId: string, authHeader: string | null) {
  let supabase;
  if (authHeader) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        }
      }
    });
  } else {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single();
  
  if (error || !data) {
    throw new Error('No Google Calendar integration found for this user');
  }
  
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  const expirationBuffer = 300000;
  
  if (now.getTime() > expiresAt.getTime() - expirationBuffer) {
    if (!data.refresh_token) {
      throw new Error('No refresh token available');
    }
    
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
      throw new Error(`Failed to refresh access token: ${JSON.stringify(errorData)}`);
    }
    
    const refreshData = await refreshResponse.json();
    
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);
    
    await supabase
      .from('user_integrations')
      .update({
        access_token: refreshData.access_token,
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', data.id);
    
    return { accessToken: refreshData.access_token, calendarId: data.calendar_id, calendarName: data.calendar_name };
  }
  
  return { accessToken: data.access_token, calendarId: data.calendar_id, calendarName: data.calendar_name };
}

async function fetchExistingCalendarEvent(accessToken: string, calendarId: string, eventId: string) {
  console.log(`🔍 Fetching existing event: ${eventId} from calendar: ${calendarId}`);
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch existing event: ${response.status} - ${errorText}`);
      return null;
    }

    const existingEvent = await response.json();
    console.log(`✅ Successfully fetched existing event with ${existingEvent.attendees?.length || 0} attendees`);
    
    return existingEvent;
  } catch (error) {
    console.error('❌ Error fetching existing calendar event:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const requestData = await req.json();
    const { eventId, userId, jobData, testMode, testData, timeZone, jobId } = requestData;
    
    console.log('Full request payload:', JSON.stringify(requestData, null, 2));
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

    // Create supabase client for database operations
    let supabase;
    if (authHeader) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: authHeader,
          }
        }
      });
    } else {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    // Get access token and user's current calendar settings
    let accessTokenData;
    try {
      accessTokenData = await getAccessTokenForUser(userId, authHeader);
    } catch (error: any) {
      console.error('Error getting access token:', error.message);
      return new Response(
        JSON.stringify({ error: 'Authentication error', message: error.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { accessToken } = accessTokenData;

    // IMPORTANT: Always use the calendar where the event was originally created
    // The event ID is unique to the specific calendar, so we must use the original calendar
    let targetCalendarId = accessTokenData.calendarId || 'primary';
    let targetCalendarName = accessTokenData.calendarName || 'Primary Calendar';
    let calendarSource = 'from user current selection (default)';
    let jobRecord = null;
    
    if (jobId) {
      console.log(`Fetching calendar_id for job: ${jobId}`);
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('calendar_id')
        .eq('id', jobId)
        .single();
        
      console.log(`Job record query result:`, { job, jobError });
      jobRecord = job;
        
      if (!jobError && job?.calendar_id) {
        targetCalendarId = job.calendar_id;
        targetCalendarName = `Calendar ${job.calendar_id}`;
        calendarSource = 'from job record (original calendar)';
        console.log(`✅ Found stored calendar ID for job: ${targetCalendarId}`);
      } else {
        console.log(`⚠️ No stored calendar ID found for job ${jobId}, using user's current selection: ${targetCalendarId}`);
        console.log(`This may cause issues if the event was created in a different calendar!`);
      }
    } else {
      console.log(`⚠️ No jobId provided, using user's current calendar selection: ${targetCalendarId}`);
    }
    
    console.log(`📅 Using calendar: ${targetCalendarId} (${targetCalendarName})`);
    console.log(`📝 Calendar source: ${calendarSource}`);

    // Fetch the existing calendar event to preserve attendees
    const existingEvent = await fetchExistingCalendarEvent(accessToken, targetCalendarId, eventId);
    
    const eventData = testMode && testData ? testData.event : jobData;
    console.log('Using event data:', JSON.stringify(eventData));

    const userTimeZone = timeZone || eventData.timeZone || 'UTC';
    console.log('User timezone from request:', userTimeZone);

    let event;
    
    let clientData = null;
    if (eventData.clientId) {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', eventData.clientId)
        .single();
        
      if (!error && client) {
        clientData = client;
      }
    }
    
    let enhancedDescription = `Job: ${eventData.title}\n`;
    enhancedDescription += `Date: ${eventData.date}\n`;
    
    if (clientData) {
      enhancedDescription += `Client: ${clientData.name}\n\n`;
      enhancedDescription += `${eventData.description || 'No description provided'}\n\n`;
      enhancedDescription += `Client Contact:\nEmail: ${clientData.email}\nPhone: ${clientData.phone}`;
    } else {
      enhancedDescription = eventData.description || '';
    }
    
    // Check isFullDay from both sources - prioritize jobData from request if available
    const isFullDayEvent = eventData.is_full_day ?? false;
    console.log('Final isFullDay decision:', isFullDayEvent);
    
    if (isFullDayEvent === true) {
      event = {
        summary: eventData.title,
        location: eventData.location,
        description: enhancedDescription,
        start: {
          date: eventData.date,
        },
        end: {
          date: eventData.date,
        },
      };
      console.log('Created all-day event object for update:', JSON.stringify(event));
    } else {
      // Use times from request jobData if available, otherwise fall back to eventData defaults
      const startTime = eventData.start_time || eventData.startTime || '09:00:00';
      const endTime = eventData.end_time || eventData.endTime || '17:00:00';
      
      const normalizedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
      const normalizedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;
      
      const formattedStartDate = `${eventData.date}T${normalizedStartTime}`;
      const formattedEndDate = `${eventData.date}T${normalizedEndTime}`;
      
      event = {
        summary: eventData.title,
        location: eventData.location,
        description: enhancedDescription,
        start: {
          dateTime: formattedStartDate,
          timeZone: userTimeZone,
        },
        end: {
          dateTime: formattedEndDate,
          timeZone: userTimeZone,
        },
      };
      
      console.log('Created timed event object for update with timezone:', JSON.stringify(event));
    }

    // PRESERVE ATTENDEES: Add existing attendees to the event update
    if (existingEvent && existingEvent.attendees && existingEvent.attendees.length > 0) {
      event.attendees = existingEvent.attendees;
      console.log(`✅ Preserved ${existingEvent.attendees.length} attendees in event update:`, 
        existingEvent.attendees.map((att: any) => att.email));
    } else {
      console.log('ℹ️ No existing attendees found to preserve');
    }
    
    console.log("Using access token:", accessToken ? "Token present" : "No token");
    console.log("🔄 Updating Google Calendar event with ID:", eventId, "in calendar:", targetCalendarId);
    
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );
    
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
      
      console.error('❌ Google Calendar API error:', errorDetails);
      
      // Special handling for 404 errors - likely means event is in wrong calendar
      if (calendarResponse.status === 404) {
        console.error(`🚨 404 Error: Event ${eventId} not found in calendar ${targetCalendarId}`);
        console.error(`This typically means the event was created in a different calendar.`);
        console.error(`Job calendar_id from DB: ${jobRecord?.calendar_id || 'not set'}`);
        console.error(`User's current calendar: ${accessTokenData.calendarId}`);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update calendar event', 
          details: errorDetails,
          status: calendarResponse.status,
          debugInfo: {
            eventId,
            targetCalendarId,
            calendarSource,
            jobCalendarId: jobRecord?.calendar_id || null,
            userCurrentCalendarId: accessTokenData.calendarId
          }
        }),
        { status: calendarResponse.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let calendarData;
    try {
      calendarData = JSON.parse(responseText);
      console.log('✅ Successfully updated event:', calendarData.id);
      console.log('Event time zone in response:', calendarData.start?.timeZone || 'Not specified');
      
      // Log attendees status after update
      if (calendarData.attendees && calendarData.attendees.length > 0) {
        console.log(`✅ Event updated with ${calendarData.attendees.length} attendees preserved`);
      } else {
        console.log('ℹ️ Updated event has no attendees');
      }
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
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event updated in calendar with attendees preserved',
        eventId: calendarData.id,
        calendarUsed: targetCalendarId,
        calendarName: targetCalendarName,
        eventTimezone: calendarData.start?.timeZone || 'Not specified',
        attendeesCount: calendarData.attendees?.length || 0
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
