
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

async function checkCalendarEventResponse(accessToken: string, calendarId: string, eventId: string) {
  console.log(`🔍 Checking calendar event responses for: ${eventId}`);
  
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
      console.error(`❌ Failed to fetch calendar event: ${response.status} - ${errorText}`);
      return null;
    }

    const event = await response.json();
    console.log(`✅ Successfully fetched event with ${event.attendees?.length || 0} attendees`);
    
    return event;
  } catch (error) {
    console.error('❌ Error fetching calendar event:', error);
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
    const { jobId } = requestData;
    
    console.log(`🔄 CHECK-CALENDAR-RESPONSES: Starting for job ${jobId}`);
    
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: jobId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user ID from the auth header
    let supabase;
    if (authHeader) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: authHeader,
          }
        }
      });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication failed');
      }
      
      console.log(`👤 User authenticated: ${user.id}`);
      
      // Get access token
      const { accessToken, calendarId } = await getAccessTokenForUser(user.id, authHeader);
      
      // Get all job teammates with calendar event IDs
      const { data: jobTeammates, error: teammatesError } = await supabase
        .from('job_teammates')
        .select('*')
        .eq('job_id', jobId)
        .not('calendar_event_id', 'is', null);
        
      if (teammatesError) {
        console.error('Error fetching job teammates:', teammatesError);
        throw new Error('Failed to fetch job teammates');
      }
      
      console.log(`📋 Found ${jobTeammates?.length || 0} teammates with calendar events`);
      
      const results = [];
      
      for (const teammate of jobTeammates || []) {
        console.log(`🔍 Checking responses for teammate: ${teammate.teammate_email}`);
        
        // First get the job's calendar event ID to check responses
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('calendar_event_id, calendar_id')
          .eq('id', jobId)
          .single();
          
        if (jobError || !job?.calendar_event_id) {
          console.log(`⚠️ No calendar event found for job ${jobId}`);
          continue;
        }
        
        const eventCalendarId = job.calendar_id || calendarId;
        const event = await checkCalendarEventResponse(accessToken, eventCalendarId, job.calendar_event_id);
        
        if (!event || !event.attendees) {
          console.log(`ℹ️ No attendees found for event ${job.calendar_event_id}`);
          continue;
        }
        
        // Find this teammate's response in the attendees list
        const attendee = event.attendees.find((att: any) => 
          att.email.toLowerCase() === teammate.teammate_email.toLowerCase()
        );
        
        if (!attendee) {
          console.log(`⚠️ Teammate ${teammate.teammate_email} not found in attendees list`);
          continue;
        }
        
        console.log(`📧 ${teammate.teammate_email} response status: ${attendee.responseStatus}`);
        
        // Map Google Calendar response status to our status
        let newStatus = teammate.invitation_status;
        const oldStatus = teammate.invitation_status;
        
        if (attendee.responseStatus === 'accepted') {
          newStatus = 'accepted';
        } else if (attendee.responseStatus === 'declined') {
          newStatus = 'declined';
        } else if (attendee.responseStatus === 'needsAction') {
          newStatus = 'sent'; // Still waiting for response
        }
        
        // Update if status changed
        if (newStatus !== oldStatus) {
          console.log(`🔄 Updating ${teammate.teammate_email} status: ${oldStatus} → ${newStatus}`);
          
          const { error: updateError } = await supabase
            .from('job_teammates')
            .update({
              invitation_status: newStatus,
              responded_at: ['accepted', 'declined'].includes(newStatus) ? new Date().toISOString() : null
            })
            .eq('id', teammate.id);
            
          if (updateError) {
            console.error(`❌ Failed to update teammate ${teammate.id}:`, updateError);
          } else {
            console.log(`✅ Updated teammate ${teammate.teammate_email} status`);
          }
          
          results.push({
            teammateId: teammate.id,
            email: teammate.teammate_email,
            oldStatus,
            newStatus,
            updated: true
          });
        } else {
          results.push({
            teammateId: teammate.id,
            email: teammate.teammate_email,
            status: newStatus,
            updated: false
          });
        }
      }
      
      console.log(`✅ Processed ${results.length} teammates`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Calendar responses checked successfully',
          results
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } else {
      throw new Error('Authentication required');
    }
    
  } catch (error) {
    console.error('❌ Error in check-calendar-responses function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
