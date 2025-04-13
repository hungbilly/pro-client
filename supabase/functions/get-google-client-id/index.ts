
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("get-google-client-id function called");
    console.log(`GOOGLE_CLIENT_ID configured: ${Boolean(GOOGLE_CLIENT_ID)}`);
    console.log(`REDIRECT_URI configured: ${Boolean(REDIRECT_URI)}`);
    
    // Return the client ID and redirect URI for debugging
    return new Response(
      JSON.stringify({ 
        clientId: GOOGLE_CLIENT_ID || null,
        redirectUri: REDIRECT_URI || null,
        error: !GOOGLE_CLIENT_ID ? 'Google client ID not configured' : null,
        // Add more diagnostic information
        clientIdLength: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.length : 0,
        requestOrigin: req.headers.get('origin') || null,
        requestReferer: req.headers.get('referer') || null,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-google-client-id function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
