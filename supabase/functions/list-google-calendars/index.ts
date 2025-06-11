
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const refreshGoogleToken = async (refreshToken: string) => {
  console.log('Refreshing Google access token...');
  
  const tokenParams = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Token refresh failed:', errorData);
    throw new Error(`Token refresh failed: ${JSON.stringify(errorData)}`);
  }

  const tokens = await response.json();
  console.log('Token refreshed successfully');
  
  return {
    access_token: tokens.access_token,
    expires_in: tokens.expires_in,
    // Note: Google may or may not return a new refresh token
    refresh_token: tokens.refresh_token || refreshToken
  };
};

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

    console.log('Listing calendars for user:', user.id);

    // Get user's Google Calendar integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('id, access_token, refresh_token, expires_at')
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

    if (!integration.access_token || !integration.refresh_token) {
      console.error('Missing access or refresh token');
      return new Response(
        JSON.stringify({ error: 'Invalid token configuration' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = integration.access_token;
    
    // Check if token is expired and refresh if needed
    if (integration.expires_at && new Date(integration.expires_at) <= new Date()) {
      console.log('Access token expired, refreshing...');
      
      try {
        const refreshedTokens = await refreshGoogleToken(integration.refresh_token);
        accessToken = refreshedTokens.access_token;
        
        // Update the database with new tokens
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + refreshedTokens.expires_in);
        
        const { error: updateError } = await supabase
          .from('user_integrations')
          .update({
            access_token: accessToken,
            refresh_token: refreshedTokens.refresh_token,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', integration.id);
        
        if (updateError) {
          console.error('Failed to update refreshed tokens:', updateError);
          // Continue anyway, the refresh might still work
        } else {
          console.log('Successfully updated refreshed tokens in database');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return new Response(
          JSON.stringify({ 
            error: 'Token expired and refresh failed. Please reconnect your Google Calendar.',
            details: refreshError instanceof Error ? refreshError.message : String(refreshError)
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch calendars from Google Calendar API
    console.log('Fetching calendars from Google Calendar API...');
    const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!calendarsResponse.ok) {
      const errorData = await calendarsResponse.json();
      console.error('Google Calendar API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch calendars from Google',
          details: errorData 
        }),
        { status: calendarsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarsData = await calendarsResponse.json();
    console.log(`Successfully fetched ${calendarsData.items?.length || 0} calendars`);

    return new Response(
      JSON.stringify(calendarsData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error listing Google calendars:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Internal server error occurred while fetching calendars'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
