
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function getAccessTokenForUser(userId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

function createCalendarEvent(job: any, client: any, teammates: any[], accessToken: string, calendarId: string, timezone: string) {
  console.log(`🔧 Creating calendar event with isFullDay: ${job.is_full_day}`);
  
  const eventData: any = {
    summary: job.title,
    description: `Job: ${job.title}\nDate: ${job.date}\nClient: ${client.name}\n\n${job.description || ''}\n\nClient Contact:\nEmail: ${client.email}\nPhone: ${client.phone}`,
    location: job.location || '',
    attendees: teammates.map(teammate => ({ email: teammate.email }))
  };

  // Handle all-day vs timed events consistently
  if (job.is_full_day) {
    console.log(`📅 Creating all-day event for date: ${job.date}`);
    eventData.start = { date: job.date };
    eventData.end = { date: job.date };
  } else {
    const startTime = job.start_time || '09:00';
    const endTime = job.end_time || '17:00';
    
    console.log(`⏰ Creating timed event: ${job.date}T${startTime} to ${job.date}T${endTime} in ${timezone}`);
    
    eventData.start = {
      dateTime: `${job.date}T${startTime}:00`,
      timeZone: timezone
    };
    eventData.end = {
      dateTime: `${job.date}T${endTime}:00`,
      timeZone: timezone
    };
  }

  return fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    }
  );
}

async function addTeammatesToEvent(eventId: string, teammates: any[], accessToken: string, calendarId: string) {
  console.log(`👥 Adding ${teammates.length} teammates to existing event: ${eventId}`);
  
  // Get current event
  const getResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!getResponse.ok) {
    throw new Error('Failed to fetch existing calendar event');
  }
  
  const existingEvent = await getResponse.json();
  const existingAttendees = existingEvent.attendees || [];
  const existingEmails = existingAttendees.map(attendee => attendee.email);
  
  // Add only new teammates
  const newAttendees = teammates
    .filter(teammate => !existingEmails.includes(teammate.email))
    .map(teammate => ({ email: teammate.email }));
  
  if (newAttendees.length === 0) {
    console.log('ℹ️ No new attendees to add');
    return { success: true, message: 'All teammates already in calendar event' };
  }
  
  const allAttendees = [...existingAttendees, ...newAttendees];
  
  // Update event
  const updateResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
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
  
  if (!updateResponse.ok) {
    throw new Error('Failed to update calendar event');
  }
  
  return { success: true, newAttendeesAdded: newAttendees.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, jobId, teammates, timeZone, eventId } = await req.json();
    
    console.log(`🔄 MANAGE-JOB-CALENDAR: Operation '${operation}' for job ${jobId}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`*, clients(*)`)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    console.log(`📋 Job details: ${job.title}, isFullDay: ${job.is_full_day}, date: ${job.date}`);

    // Get calendar integration
    const { accessToken, calendarId } = await getAccessTokenForUser(user.id);
    const targetCalendarId = calendarId || 'primary';
    const eventTimezone = job.timezone || timeZone || 'UTC';

    let result: any = {};

    switch (operation) {
      case 'create_with_teammates': {
        console.log(`🆕 Creating new calendar event with ${teammates.length} teammates`);
        
        // Create job teammate records first
        for (const teammate of teammates) {
          let teammateId = teammate.id;
          
          if (!teammateId) {
            const { data: newTeammate, error: createError } = await supabase
              .from('teammates')
              .insert({
                user_id: user.id,
                company_id: job.company_id,
                name: teammate.name,
                email: teammate.email
              })
              .select('id')
              .single();

            if (createError) {
              console.error('Error creating teammate:', createError);
              continue;
            }
            teammateId = newTeammate.id;
          }

          await supabase
            .from('job_teammates')
            .insert({
              job_id: jobId,
              teammate_id: teammateId,
              teammate_name: teammate.name,
              teammate_email: teammate.email,
              invitation_status: 'sent',
              invited_at: new Date().toISOString()
            });
        }

        // Create calendar event
        const calendarResponse = await createCalendarEvent(
          job, 
          job.clients, 
          teammates, 
          accessToken, 
          targetCalendarId, 
          eventTimezone
        );

        if (!calendarResponse.ok) {
          throw new Error(`Calendar API error: ${await calendarResponse.text()}`);
        }

        const calendarData = await calendarResponse.json();
        const newEventId = calendarData.id;

        // Update job and job_teammates with calendar event ID
        await supabase
          .from('jobs')
          .update({ 
            calendar_event_id: newEventId,
            calendar_id: targetCalendarId 
          })
          .eq('id', jobId);

        await supabase
          .from('job_teammates')
          .update({ calendar_event_id: newEventId })
          .eq('job_id', jobId);

        result = {
          success: true,
          eventId: newEventId,
          message: 'Calendar event created with teammates'
        };
        break;
      }

      case 'add_teammates': {
        if (!eventId) {
          throw new Error('Event ID required for add_teammates operation');
        }

        console.log(`➕ Adding ${teammates.length} teammates to existing event ${eventId}`);

        // Create job teammate records
        for (const teammate of teammates) {
          await supabase
            .from('job_teammates')
            .insert({
              job_id: jobId,
              teammate_id: teammate.id,
              teammate_name: teammate.name,
              teammate_email: teammate.email,
              invitation_status: 'sent',
              invited_at: new Date().toISOString(),
              calendar_event_id: eventId
            });
        }

        // Add to calendar event
        const addResult = await addTeammatesToEvent(eventId, teammates, accessToken, targetCalendarId);
        
        result = {
          success: true,
          eventId: eventId,
          message: 'Teammates added to existing calendar event',
          ...addResult
        };
        break;
      }

      case 'update_event': {
        // This would handle updating job details in calendar
        // Implementation would go here if needed
        result = {
          success: true,
          message: 'Event update not yet implemented'
        };
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    console.log(`✅ Operation '${operation}' completed successfully`);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error in manage-job-calendar:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
