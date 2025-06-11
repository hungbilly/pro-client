
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const requestData = await req.json();
    const { jobId, clientId, userId, testMode, testData, userTimeZone } = requestData;
    
    console.log('Full request payload:', JSON.stringify(requestData, null, 2));
    console.log(`Adding to calendar for user: ${userId}`);
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    
    const { accessToken, calendarId, calendarName } = accessTokenData;
    
    // Use selected calendar or fall back to primary
    const targetCalendarId = calendarId || 'primary';
    console.log(`Using calendar: ${targetCalendarId} (${calendarName || 'Primary Calendar'})`);
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token available' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let eventData, clientData;
    
    if (testMode && testData) {
      eventData = testData.event;
      clientData = testData.client;
      console.log('Test mode - using provided test data');
    } else {
      if (!jobId || !clientId) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: jobId or clientId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
      
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();
        
      if (jobError || !job) {
        console.error('Job not found:', jobError);
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
        
      if (clientError || !client) {
        console.error('Client not found:', clientError);
        return new Response(
          JSON.stringify({ error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      eventData = job;
      clientData = client;
    }
    
    const timeZoneToUse = userTimeZone || eventData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('User timezone:', timeZoneToUse);
    console.log('Event isFullDay from job data:', eventData.isFullDay);
    console.log('Event isFullDay from request jobData:', requestData.jobData?.isFullDay);
    
    let event;
    let enhancedDescription = `Job: ${eventData.title}\n`;
    enhancedDescription += `Date: ${eventData.date}\n`;
    enhancedDescription += `Client: ${clientData.name}\n\n`;
    enhancedDescription += `${eventData.description || 'No description provided'}\n\n`;
    enhancedDescription += `Client Contact:\nEmail: ${clientData.email}\nPhone: ${clientData.phone}`;
    
    // Check isFullDay from both sources - prioritize jobData from request if available
    const isFullDayEvent = requestData.jobData?.isFullDay ?? eventData.isFullDay ?? false;
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
      console.log('Created all-day event object:', JSON.stringify(event));
    } else {
      // Use times from request jobData if available, otherwise fall back to eventData
      const startTime = requestData.jobData?.startTime || eventData.startTime || '09:00:00';
      const endTime = requestData.jobData?.endTime || eventData.endTime || '17:00:00';
      
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
          timeZone: timeZoneToUse,
        },
        end: {
          dateTime: formattedEndDate,
          timeZone: timeZoneToUse,
        },
      };
      
      console.log('Created timed event object with timezone:', JSON.stringify(event));
    }
    
    console.log("Using access token:", accessToken ? "Token present" : "No token");
    console.log("Creating Google Calendar event in calendar:", targetCalendarId);
    
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`,
      {
        method: 'POST',
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
      
      console.error('Google Calendar API error:', errorDetails);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create calendar event', 
          details: errorDetails,
          status: calendarResponse.status
        }),
        { status: calendarResponse.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let calendarData;
    try {
      calendarData = JSON.parse(responseText);
      console.log('Successfully created event:', calendarData.id);
      console.log('Event time zone in response:', calendarData.start?.timeZone || 'Not specified');
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
    
    if (!testMode && jobId) {
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
      
      // Store both the calendar event ID and the calendar ID used
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          calendar_event_id: calendarData.id,
          calendar_id: targetCalendarId // Store which calendar was used
        })
        .eq('id', jobId);
      
      if (updateError) {
        console.error('Error updating job with calendar event ID:', updateError);
      } else {
        console.log('Successfully updated job with calendar event ID and calendar ID');
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event added to calendar',
        eventId: calendarData.id,
        calendarUsed: targetCalendarId,
        calendarName: calendarName || 'Primary Calendar',
        eventTimezone: calendarData.start?.timeZone || 'Not specified'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in add-to-calendar function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
