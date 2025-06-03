
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('🚀 REMOVE-TEAMMATE-FROM-CALENDAR: Function started');
  console.log('📝 Request method:', req.method);
  console.log('📝 Request headers:', Object.fromEntries(req.headers.entries()));

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
      .eq('provider', 'google')
      .single();

    console.log('🔍 Token query result:', { hasTokens: !!tokens, tokenError });

    if (tokenError || !tokens) {
      console.error('❌ No Google tokens found for user:', tokenError);
      throw new Error('Google Calendar access not available. Please reconnect your Google account.');
    }

    console.log('✅ Google tokens found for user');

    // First, get the current event to see all attendees
    console.log('📅 Fetching current calendar event details...');
    const getEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📅 Get event response status:', getEventResponse.status);

    if (!getEventResponse.ok) {
      if (getEventResponse.status === 401) {
        console.log('🔄 Access token expired, attempting to refresh...');
        
        // Try to refresh the token
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
          
          // Update stored tokens
          await supabase
            .from('user_integrations')
            .update({ access_token: refreshData.access_token })
            .eq('user_id', user.id)
            .eq('provider', 'google');

          console.log('✅ Updated stored access token');

          // Retry the request with new token
          console.log('🔄 Retrying event fetch with new token...');
          const retryResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
            {
              headers: {
                'Authorization': `Bearer ${refreshData.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          console.log('🔄 Retry response status:', retryResponse.status);

          if (!retryResponse.ok) {
            const error = `Failed to get calendar event after token refresh: ${retryResponse.status}`;
            console.error('❌', error);
            throw new Error(error);
          }

          const eventData = await retryResponse.json();
          console.log('📅 Event data retrieved, current attendees count:', eventData.attendees?.length || 0);
          
          const updatedAttendees = (eventData.attendees || []).filter(
            (attendee: any) => attendee.email.toLowerCase() !== teammateEmail.toLowerCase()
          );

          console.log('👥 Attendees after filtering:', updatedAttendees.length);

          // Update the event with the new attendees list
          console.log('📝 Updating calendar event with new attendees list...');
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

          console.log('📝 Update response status:', updateResponse.status);

          if (!updateResponse.ok) {
            const error = `Failed to update calendar event: ${updateResponse.status}`;
            console.error('❌', error);
            throw new Error(error);
          }

          console.log(`✅ Successfully removed ${teammateEmail} from calendar event ${calendarEventId}`);
        } else {
          const error = 'Failed to refresh Google access token';
          console.error('❌', error);
          throw new Error(error);
        }
      } else if (getEventResponse.status === 404) {
        console.log(`⚠️ Calendar event ${calendarEventId} not found, it may have already been deleted`);
      } else {
        const error = `Failed to get calendar event: ${getEventResponse.status}`;
        console.error('❌', error);
        throw new Error(error);
      }
    } else {
      // Token is valid, proceed with removing the attendee
      console.log('✅ Token is valid, proceeding with attendee removal');
      const eventData = await getEventResponse.json();
      console.log('📅 Event data retrieved, current attendees count:', eventData.attendees?.length || 0);
      
      const updatedAttendees = (eventData.attendees || []).filter(
        (attendee: any) => attendee.email.toLowerCase() !== teammateEmail.toLowerCase()
      );

      console.log('👥 Attendees after filtering:', updatedAttendees.length);

      // Update the event with the new attendees list
      console.log('📝 Updating calendar event with new attendees list...');
      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...eventData,
            attendees: updatedAttendees,
          }),
        }
      );

      console.log('📝 Update response status:', updateResponse.status);

      if (!updateResponse.ok) {
        const error = `Failed to update calendar event: ${updateResponse.status}`;
        console.error('❌', error);
        throw new Error(error);
      }

      console.log(`✅ Successfully removed ${teammateEmail} from calendar event ${calendarEventId}`);
    }

    console.log('🎉 Function completed successfully');
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
