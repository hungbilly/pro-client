
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { redirectUrl, state } = await req.json();
    
    if (!GOOGLE_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_CLIENT_ID not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Creating Google Calendar auth URL with state:', state);
    
    // Validate that state includes user ID
    let stateObj;
    try {
      stateObj = JSON.parse(state);
      if (!stateObj.userId) {
        return new Response(
          JSON.stringify({ error: 'Missing userId in state parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Creating auth URL for user: ${stateObj.userId}`);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid state parameter, must be valid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the redirect URL
    const callbackUrl = `${SUPABASE_URL}/functions/v1/handle-google-calendar-callback`;
    
    // Google OAuth2 authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    
    // Add all required parameters
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', callbackUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar.events');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent'); // Force to always get a refresh token
    authUrl.searchParams.append('state', state);
    
    console.log('Generated auth URL with redirect:', callbackUrl);
    
    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Google Calendar auth URL:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create authorization URL', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
