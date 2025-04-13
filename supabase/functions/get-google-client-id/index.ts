
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
    
    // Additional diagnostic logging
    console.log('Detailed Configuration Check:');
    console.log(`- Client ID Length: ${GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.length : 'N/A'}`);
    console.log(`- Client ID Prefix: ${GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 5) + '...' : 'N/A'}`);
    console.log(`- Redirect URI: ${REDIRECT_URI || 'NOT SET'}`);
    
    // Check for common configuration issues
    const diagnosticInfo = {
      clientIdSet: Boolean(GOOGLE_CLIENT_ID),
      clientIdLength: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.length : 0,
      redirectUriSet: Boolean(REDIRECT_URI),
      requestOrigin: req.headers.get('origin') || null,
      requestReferer: req.headers.get('referer') || null,
      timestamp: new Date().toISOString(),
      potentialIssues: []
    };
    
    // Add potential issue detection
    if (!GOOGLE_CLIENT_ID) {
      diagnosticInfo.potentialIssues.push('GOOGLE_CLIENT_ID is not set in Supabase secrets');
    }
    if (!REDIRECT_URI) {
      diagnosticInfo.potentialIssues.push('GOOGLE_REDIRECT_URI is not set in Supabase secrets');
    }
    
    return new Response(
      JSON.stringify({ 
        clientId: GOOGLE_CLIENT_ID || null,
        redirectUri: REDIRECT_URI || null,
        diagnosticInfo,
        error: !GOOGLE_CLIENT_ID ? 'Google client ID not configured' : null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-google-client-id function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

