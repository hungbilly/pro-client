
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
    
    return refreshData.access_token;
  }
  
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const requestData = await req.json();
    const { userId, calendarName, description } = requestData;
    
    console.log('Creating calendar for user:', userId, 'with name:', calendarName);
    
    if (!userId || !calendarName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId or calendarName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken;
    try {
      accessToken = await getAccessTokenForUser(userId, authHeader);
    } catch (error: any) {
      console.error('Error getting access token:', error.message);
      return new Response(
        JSON.stringify({ error: 'Authentication error', message: error.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const calendarBody = {
      summary: calendarName,
      description: description || `Business calendar for ${calendarName}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    console.log('Creating calendar with body:', JSON.stringify(calendarBody));
    
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarBody),
      }
    );
    
    const responseText = await calendarResponse.text();
    console.log(`Google Calendar Create API response status: ${calendarResponse.status}`);
    
    if (!calendarResponse.ok) {
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = { rawText: responseText };
      }
      
      console.error('Google Calendar Create API error:', errorDetails);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create calendar', 
          details: errorDetails,
          status: calendarResponse.status
        }),
        { status: calendarResponse.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const calendarData = JSON.parse(responseText);
    console.log('Successfully created calendar:', calendarData.id);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        calendar: {
          id: calendarData.id,
          summary: calendarData.summary,
          description: calendarData.description,
          primary: false
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in create-google-calendar function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
