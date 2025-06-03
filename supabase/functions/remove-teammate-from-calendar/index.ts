
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

    // Get user's Google access token from user_integrations table
    console.log('🔍 Fetching Google tokens from user_integrations...');
    const { data: tokens, error: tokenError } = await supabase
      .from('user_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single();

    console.log('🔍 Token query result:', { hasTokens: !!tokens, tokenError });

    if (tokenError || !tokens) {
      console.warn('⚠️ No Google tokens found for user:', tokenError);
      console.log('ℹ️ Skipping Google Calendar removal due to missing tokens, will only remove from database');
      
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
      console.log('✅ Google tokens found for user, proceeding with calendar removal');

      let accessToken = tokens.access_token;
      let shouldUpdateToken = false;

      // Function to try calendar operation with token refresh if needed
      const tryCalendarOperation = async (token: string) => {
        console.log('📅 Fetching current calendar event details...');
        const getEventResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
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

      let getEventResponse = await tryCalendarOperation(accessToken);

      // Handle token refresh if needed
      if (getEventResponse.status === 401) {
        console.log('🔄 Access token expired, attempting to refresh...');
        
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            refresh_token: tokens.refresh_token,
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
          console.log('🔄 Retrying event fetch with new token...');
          getEventResponse = await tryCalendarOperation(accessToken);
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

      if (getEventResponse.status === 404) {
        console.log(`ℹ️ Calendar event ${calendarEventId} not found, it may have already been deleted`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Teammate ${teammateEmail} removed from job`,
            calendarRemoved: false,
            reason: 'Calendar event not found'
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
            reason: 'Attendee not found in event'
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
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
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
        console.log(`✅ Successfully removed ${teammateEmail} from calendar event ${calendarEventId}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Teammate ${teammateEmail} removed from job and calendar`,
            calendarRemoved: true
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
