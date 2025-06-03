
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('🚀 REMOVE-TEAMMATE-FROM-CALENDAR: Function started');
  console.log('📝 Request method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Parsing request body...');
    const { jobTeammateId, calendarEventId, teammateEmail } = await req.json();
    
    console.log('📋 Request parameters:', {
      jobTeammateId,
      calendarEventId,
      teammateEmail
    });
    
    if (!jobTeammateId || !calendarEventId || !teammateEmail) {
      const error = 'Missing required parameters: jobTeammateId, calendarEventId, and teammateEmail are required';
      console.error('❌ Parameter validation failed:', error);
      throw new Error(error);
    }

    console.log('✅ All required parameters provided');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔗 Supabase client initialized');

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      const error = 'No authorization header provided';
      console.error('❌ Auth error:', error);
      throw new Error(error);
    }

    // Get user ID from the token
    const token = authHeader.replace('Bearer ', '');
    console.log('🎟️ Extracted token (first 20 chars):', token.substring(0, 20) + '...');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ User validation failed:', userError);
      throw new Error('Invalid token or user not found');
    }

    console.log('👤 User authenticated:', user.id);
    console.log(`🗑️ Removing teammate ${teammateEmail} from calendar event ${calendarEventId}`);

    // Get user's Google access token and calendar ID from user_integrations table
    console.log('🔍 Fetching Google tokens and calendar ID from user_integrations...');
    const { data: integration, error: tokenError } = await supabase
      .from('user_integrations')
      .select('access_token, refresh_token, calendar_id')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single();

    console.log('🔍 Integration query result:', { 
      hasIntegration: !!integration, 
      hasCalendarId: !!integration?.calendar_id,
      calendarId: integration?.calendar_id,
      tokenError 
    });

    if (tokenError || !integration) {
      console.warn('⚠️ No Google integration found for user:', tokenError);
      console.log('ℹ️ Skipping Google Calendar removal due to missing integration, will only remove from database');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Teammate ${teammateEmail} removed from job`,
          calendarRemoved: false,
          reason: 'No Google Calendar integration found'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      console.log('✅ Google integration found for user, proceeding with calendar removal');

      // Determine which calendar to use - same logic as invite function
      const targetCalendarId = integration.calendar_id || 'primary';
      console.log('📅 Using calendar ID:', targetCalendarId);

      let accessToken = integration.access_token;
      let shouldUpdateToken = false;

      // Function to try calendar operation with token refresh if needed
      const tryCalendarOperation = async (token: string, eventId: string) => {
        console.log(`📅 Fetching calendar event details for ID: ${eventId} from calendar: ${targetCalendarId}`);
        const getEventResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${eventId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('📅 Get event response status:', getEventResponse.status);
        return getEventResponse;
      };

      // Try different event ID formats
      const eventIdsToTry = [
        calendarEventId,
        // Try URL-encoded version
        encodeURIComponent(calendarEventId),
        // Try URL-decoded version
        decodeURIComponent(calendarEventId),
        // Try with _R suffix (recurring events)
        calendarEventId + '_R',
        // Try base64 decode if it looks encoded
        (() => {
          try {
            return atob(calendarEventId);
          } catch {
            return null;
          }
        })()
      ].filter(Boolean);

      console.log('🔍 Trying different event ID formats:', eventIdsToTry);

      let getEventResponse: Response | null = null;
      let workingEventId = calendarEventId;

      // Try each event ID format
      for (const eventIdToTry of eventIdsToTry) {
        console.log(`🔍 Trying event ID: ${eventIdToTry}`);
        const response = await tryCalendarOperation(accessToken, eventIdToTry);
        
        if (response.status === 200) {
          console.log(`✅ Found event with ID: ${eventIdToTry}`);
          getEventResponse = response;
          workingEventId = eventIdToTry;
          break;
        } else if (response.status === 404) {
          console.log(`❌ Event not found with ID: ${eventIdToTry}`);
        } else if (response.status === 401) {
          console.log(`🔄 Need to refresh token for ID: ${eventIdToTry}`);
          // We'll handle token refresh below
          getEventResponse = response;
          workingEventId = eventIdToTry;
          break;
        } else {
          console.log(`⚠️ Unexpected response status ${response.status} for ID: ${eventIdToTry}`);
        }
      }

      // Handle token refresh if needed
      if (getEventResponse && getEventResponse.status === 401) {
        console.log('🔄 Access token expired, attempting to refresh...');
        
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

        console.log('🔄 Refresh token response status:', refreshResponse.status);

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          console.log('✅ Token refreshed successfully');
          accessToken = refreshData.access_token;
          shouldUpdateToken = true;
          
          // Retry the request with new token
          console.log(`🔄 Retrying event fetch with new token for ID: ${workingEventId}`);
          getEventResponse = await tryCalendarOperation(accessToken, workingEventId);
        } else {
          console.warn('⚠️ Failed to refresh Google access token, skipping calendar removal');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `Teammate ${teammateEmail} removed from job`,
              calendarRemoved: false,
              reason: 'Failed to refresh Google Calendar tokens'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
      }

      // Update stored token if it was refreshed
      if (shouldUpdateToken) {
        await supabase
          .from('user_integrations')
          .update({ access_token: accessToken })
          .eq('user_id', user.id)
          .eq('provider', 'google_calendar');
        console.log('✅ Updated stored access token');
      }

      if (!getEventResponse || getEventResponse.status === 404) {
        console.log(`ℹ️ Calendar event not found with any of the tried IDs. Original ID: ${calendarEventId}`);
        
        // List recent events to help debug
        console.log('🔍 Listing recent calendar events to help debug...');
        try {
          const listResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?maxResults=10&orderBy=updated`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (listResponse.ok) {
            const listData = await listResponse.json();
            console.log('📋 Recent events:');
            listData.items?.forEach((event: any, index: number) => {
              console.log(`${index + 1}. ID: ${event.id}, Summary: ${event.summary}, Created: ${event.created}`);
            });
          }
        } catch (error) {
          console.log('⚠️ Could not list recent events:', error);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Teammate ${teammateEmail} removed from job`,
            calendarRemoved: false,
            reason: 'Calendar event not found with any tried ID formats',
            triedIds: eventIdsToTry
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      if (!getEventResponse.ok) {
        console.warn(`⚠️ Failed to get calendar event (${getEventResponse.status}), skipping calendar removal`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Teammate ${teammateEmail} removed from job`,
            calendarRemoved: false,
            reason: 'Failed to fetch calendar event'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      // Successfully got the event, now remove the attendee
      const eventData = await getEventResponse.json();
      console.log('📅 Event data retrieved successfully');
      console.log('📊 Current attendees:', eventData.attendees?.map((a: any) => ({ email: a.email, status: a.responseStatus })) || []);
      
      // Filter out the teammate to be removed (case-insensitive comparison)
      const originalAttendees = eventData.attendees || [];
      const updatedAttendees = originalAttendees.filter(
        (attendee: any) => {
          const shouldKeep = attendee.email.toLowerCase() !== teammateEmail.toLowerCase();
          if (!shouldKeep) {
            console.log(`🎯 Found and removing attendee: ${attendee.email}`);
          }
          return shouldKeep;
        }
      );

      console.log('📊 Attendees before removal:', originalAttendees.length);
      console.log('📊 Attendees after removal:', updatedAttendees.length);
      
      if (originalAttendees.length === updatedAttendees.length) {
        console.log(`⚠️ Attendee ${teammateEmail} was not found in the event attendees list`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Teammate ${teammateEmail} was not found in calendar event attendees`,
            calendarRemoved: false,
            reason: 'Attendee not found in event',
            eventId: workingEventId
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      // Update the event with the new attendees list
      console.log('📝 Updating calendar event with new attendees list...');
      const updateEventData = {
        ...eventData,
        attendees: updatedAttendees,
      };
      
      // Remove fields that shouldn't be included in the update
      delete updateEventData.kind;
      delete updateEventData.etag;
      delete updateEventData.htmlLink;
      delete updateEventData.iCalUID;
      delete updateEventData.sequence;
      delete updateEventData.updated;
      
      console.log('📤 Sending update request to Google Calendar...');
      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${workingEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateEventData),
        }
      );

      console.log('📝 Update response status:', updateResponse.status);

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Failed to update calendar event:', errorText);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Teammate ${teammateEmail} removed from job`,
            calendarRemoved: false,
            reason: 'Failed to update calendar event'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      } else {
        console.log(`✅ Successfully removed ${teammateEmail} from calendar event ${workingEventId} in calendar ${targetCalendarId}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Teammate ${teammateEmail} removed from job and calendar`,
            calendarRemoved: true,
            eventId: workingEventId,
            calendarId: targetCalendarId
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    }

  } catch (error) {
    console.error('💥 ERROR in remove-teammate-from-calendar:', error);
    console.error('💥 Error stack:', error.stack);
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
