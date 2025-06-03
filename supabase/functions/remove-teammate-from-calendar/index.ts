
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobTeammateId, calendarEventId, teammateEmail } = await req.json();
    
    if (!jobTeammateId || !calendarEventId || !teammateEmail) {
      throw new Error('Missing required parameters: jobTeammateId, calendarEventId, and teammateEmail are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    // Get user ID from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token or user not found');
    }

    console.log(`Removing teammate ${teammateEmail} from calendar event ${calendarEventId}`);

    // Get user's Google access token from user_integrations table
    const { data: integration, error: tokenError } = await supabase
      .from('user_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single();

    if (tokenError || !integration) {
      console.error('No Google tokens found for user:', tokenError);
      throw new Error('Google Calendar access not available. Please reconnect your Google account.');
    }

    // First, get the current event to see all attendees
    const getEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!getEventResponse.ok) {
      if (getEventResponse.status === 401) {
        // Try to refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            refresh_token: integration.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          
          // Update stored tokens
          await supabase
            .from('user_integrations')
            .update({ access_token: refreshData.access_token })
            .eq('user_id', user.id)
            .eq('provider', 'google_calendar');

          // Retry the request with new token
          const retryResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
            {
              headers: {
                'Authorization': `Bearer ${refreshData.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!retryResponse.ok) {
            throw new Error(`Failed to get calendar event after token refresh: ${retryResponse.status}`);
          }

          const eventData = await retryResponse.json();
          const updatedAttendees = (eventData.attendees || []).filter(
            (attendee: any) => attendee.email.toLowerCase() !== teammateEmail.toLowerCase()
          );

          // Update the event with the new attendees list
          const updateResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${refreshData.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...eventData,
                attendees: updatedAttendees,
              }),
            }
          );

          if (!updateResponse.ok) {
            throw new Error(`Failed to update calendar event: ${updateResponse.status}`);
          }

          console.log(`Successfully removed ${teammateEmail} from calendar event ${calendarEventId}`);
        } else {
          throw new Error('Failed to refresh Google access token');
        }
      } else if (getEventResponse.status === 404) {
        console.log(`Calendar event ${calendarEventId} not found, it may have already been deleted`);
      } else {
        throw new Error(`Failed to get calendar event: ${getEventResponse.status}`);
      }
    } else {
      // Token is valid, proceed with removing the attendee
      const eventData = await getEventResponse.json();
      const updatedAttendees = (eventData.attendees || []).filter(
        (attendee: any) => attendee.email.toLowerCase() !== teammateEmail.toLowerCase()
      );

      // Update the event with the new attendees list
      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...eventData,
            attendees: updatedAttendees,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update calendar event: ${updateResponse.status}`);
      }

      console.log(`Successfully removed ${teammateEmail} from calendar event ${calendarEventId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Teammate ${teammateEmail} removed from calendar event` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error removing teammate from calendar:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
