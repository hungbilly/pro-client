
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== REMOVE TEAMMATE FROM CALENDAR FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...');
    const { jobTeammateId, calendarEventId, teammateEmail } = await req.json();
    console.log('Request payload:', { jobTeammateId, calendarEventId, teammateEmail });
    
    if (!jobTeammateId || !calendarEventId || !teammateEmail) {
      const error = 'Missing required parameters: jobTeammateId, calendarEventId, and teammateEmail are required';
      console.error('Validation error:', error);
      throw new Error(error);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log('Initializing Supabase client with URL:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    console.log('Authorization header value:', authHeader?.substring(0, 20) + '...');
    
    if (!authHeader) {
      const error = 'No authorization header provided';
      console.error('Auth error:', error);
      throw new Error(error);
    }

    // Get user ID from the token
    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token (first 20 chars):', token.substring(0, 20) + '...');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log('User lookup result:', { userId: user?.id, error: userError });
    
    if (userError || !user) {
      const error = `Invalid token or user not found: ${userError?.message}`;
      console.error('User validation error:', error);
      throw new Error(error);
    }

    console.log(`Authenticated user: ${user.id}`);
    console.log(`Removing teammate ${teammateEmail} from calendar event ${calendarEventId}`);

    // Get user's Google access token from user_integrations table
    console.log('Fetching Google integration tokens...');
    const { data: integration, error: tokenError } = await supabase
      .from('user_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single();

    console.log('Integration lookup result:', { 
      hasIntegration: !!integration, 
      hasAccessToken: !!integration?.access_token,
      hasRefreshToken: !!integration?.refresh_token,
      error: tokenError 
    });

    if (tokenError || !integration) {
      console.error('No Google tokens found for user:', tokenError);
      throw new Error('Google Calendar access not available. Please reconnect your Google account.');
    }

    console.log('Making request to Google Calendar API...');
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

    console.log('Get event response status:', getEventResponse.status);

    if (!getEventResponse.ok) {
      if (getEventResponse.status === 401) {
        console.log('Access token expired, attempting to refresh...');
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

        console.log('Token refresh response status:', refreshResponse.status);

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          console.log('Successfully refreshed access token');
          
          // Update stored tokens
          await supabase
            .from('user_integrations')
            .update({ access_token: refreshData.access_token })
            .eq('user_id', user.id)
            .eq('provider', 'google_calendar');

          console.log('Updated stored access token');

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

          console.log('Retry get event response status:', retryResponse.status);

          if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            console.error('Failed to get calendar event after token refresh:', errorText);
            throw new Error(`Failed to get calendar event after token refresh: ${retryResponse.status}`);
          }

          const eventData = await retryResponse.json();
          console.log('Current event attendees count:', eventData.attendees?.length || 0);
          
          const updatedAttendees = (eventData.attendees || []).filter(
            (attendee: any) => attendee.email.toLowerCase() !== teammateEmail.toLowerCase()
          );

          console.log('Updated attendees count after filtering:', updatedAttendees.length);

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

          console.log('Update event response status:', updateResponse.status);

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Failed to update calendar event:', errorText);
            throw new Error(`Failed to update calendar event: ${updateResponse.status}`);
          }

          console.log(`Successfully removed ${teammateEmail} from calendar event ${calendarEventId}`);
        } else {
          const errorText = await refreshResponse.text();
          console.error('Failed to refresh Google access token:', errorText);
          throw new Error('Failed to refresh Google access token');
        }
      } else if (getEventResponse.status === 404) {
        console.log(`Calendar event ${calendarEventId} not found, it may have already been deleted`);
      } else {
        const errorText = await getEventResponse.text();
        console.error('Failed to get calendar event:', errorText);
        throw new Error(`Failed to get calendar event: ${getEventResponse.status}`);
      }
    } else {
      console.log('Access token is valid, proceeding with attendee removal');
      // Token is valid, proceed with removing the attendee
      const eventData = await getEventResponse.json();
      console.log('Current event attendees count:', eventData.attendees?.length || 0);
      
      const updatedAttendees = (eventData.attendees || []).filter(
        (attendee: any) => attendee.email.toLowerCase() !== teammateEmail.toLowerCase()
      );

      console.log('Updated attendees count after filtering:', updatedAttendees.length);

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

      console.log('Update event response status:', updateResponse.status);

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Failed to update calendar event:', errorText);
        throw new Error(`Failed to update calendar event: ${updateResponse.status}`);
      }

      console.log(`Successfully removed ${teammateEmail} from calendar event ${calendarEventId}`);
    }

    console.log('=== FUNCTION COMPLETED SUCCESSFULLY ===');
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
    console.error('=== FUNCTION ERROR ===');
    console.error('Error removing teammate from calendar:', error);
    console.error('Error stack:', error.stack);
    console.error('=== END ERROR ===');
    
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
