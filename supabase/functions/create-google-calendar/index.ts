
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client with the user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the user session
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Invalid user session:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { calendarName } = await req.json();

    if (!calendarName) {
      return new Response(
        JSON.stringify({ error: 'Calendar name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating calendar for user:', user.id, 'with name:', calendarName);

    // Get user's Google Calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single();

    if (integrationError || !integration) {
      console.error('No Google Calendar integration found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration.access_token) {
      console.error('No access token available');
      return new Response(
        JSON.stringify({ error: 'No access token available' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    let accessToken = integration.access_token;
    if (integration.expires_at && new Date(integration.expires_at) <= new Date()) {
      console.log('Access token expired, refreshing...');
      // TODO: Implement token refresh logic here
      return new Response(
        JSON.stringify({ error: 'Token expired, please reconnect' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create calendar using Google Calendar API
    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: calendarName,
        description: `Calendar for ${calendarName}`,
        timeZone: 'UTC'
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('Google Calendar API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create calendar' }),
        { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newCalendar = await createResponse.json();
    console.log('Successfully created calendar:', newCalendar.id);

    return new Response(
      JSON.stringify(newCalendar),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Google calendar:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
