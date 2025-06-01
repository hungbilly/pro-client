
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
    
    return { accessToken: refreshData.access_token, calendarId: data.calendar_id };
  }
  
  return { accessToken: data.access_token, calendarId: data.calendar_id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const { eventId, teammates, jobId, userId } = await req.json();
    
    console.log(`Adding teammates to calendar event: ${eventId}`);
    console.log(`New teammates to add:`, teammates);
    
    if (!eventId || !teammates || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get access token
    const { accessToken, calendarId } = await getAccessTokenForUser(userId, authHeader);
    
    // Get current event to preserve existing attendees
    const targetCalendarId = calendarId || 'primary';
    
    const getEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${eventId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!getEventResponse.ok) {
      const errorText = await getEventResponse.text();
      console.error('Failed to fetch existing calendar event:', errorText);
      throw new Error('Failed to fetch existing calendar event');
    }
    
    const existingEvent = await getEventResponse.json();
    console.log('Existing event attendees:', existingEvent.attendees || []);
    
    // Get the emails of teammates that should be added
    const newTeammateEmails = teammates.map(teammate => teammate.email);
    console.log('New teammate emails to add:', newTeammateEmails);
    
    // Preserve existing attendees and only add truly new ones
    const existingAttendees = existingEvent.attendees || [];
    const existingEmails = existingAttendees.map(attendee => attendee.email);
    
    // Filter out teammates that are already attendees
    const newAttendees = teammates
      .filter(teammate => !existingEmails.includes(teammate.email))
      .map(teammate => ({ email: teammate.email }));
    
    console.log('Filtered new attendees to add:', newAttendees);
    
    // Only proceed if there are actually new attendees to add
    if (newAttendees.length === 0) {
      console.log('No new attendees to add - all teammates are already in the event');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All teammates are already in the calendar event',
          eventId: eventId,
          attendeesCount: existingAttendees.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Combine existing and new attendees
    const allAttendees = [...existingAttendees, ...newAttendees];
    
    console.log('Final attendees list for update:', allAttendees);
    
    // Update the calendar event with new attendees
    const updateEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...existingEvent,
          attendees: allAttendees
        }),
      }
    );
    
    if (!updateEventResponse.ok) {
      const errorData = await updateEventResponse.text();
      console.error('Failed to update calendar event:', errorData);
      throw new Error('Failed to update calendar event');
    }
    
    const updatedEvent = await updateEventResponse.json();
    console.log('Successfully updated calendar event with new attendees');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Teammates added to calendar event',
        eventId: updatedEvent.id,
        attendeesCount: allAttendees.length,
        newAttendeesAdded: newAttendees.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in add-teammates-to-calendar-event function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
