
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
// Default Supabase redirect URI
const DEFAULT_REDIRECT_URI = 'https://htjvyzmuqsrjpesdurni.supabase.co/auth/v1/callback';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("google-auth-exchange function called");
    console.log(`GOOGLE_CLIENT_ID configured: ${Boolean(GOOGLE_CLIENT_ID)}`);
    console.log(`GOOGLE_CLIENT_SECRET configured: ${Boolean(GOOGLE_CLIENT_SECRET)}`);
    
    const { code, redirectUri, state } = await req.json();
    const effectiveRedirectUri = redirectUri || DEFAULT_REDIRECT_URI;
    
    // Enhanced diagnostic logging
    const diagnosticInfo = {
      authCodeReceived: Boolean(code),
      authCodeLength: code ? code.length : 0,
      redirectUriReceived: Boolean(redirectUri),
      effectiveRedirectUri,
      usingDefaultRedirectUri: !redirectUri || redirectUri === DEFAULT_REDIRECT_URI,
      stateReceived: Boolean(state),
      stateLength: state ? state.length : 0,
      clientIdSet: Boolean(GOOGLE_CLIENT_ID),
      clientSecretSet: Boolean(GOOGLE_CLIENT_SECRET),
      timestamp: new Date().toISOString(),
      potentialIssues: []
    };
    
    // Add potential issue detection
    if (!code) {
      diagnosticInfo.potentialIssues.push('No authorization code received');
    }
    if (!state) {
      diagnosticInfo.potentialIssues.push('No state parameter received');
    }
    if (!GOOGLE_CLIENT_ID) {
      diagnosticInfo.potentialIssues.push('GOOGLE_CLIENT_ID is not set');
    }
    if (!GOOGLE_CLIENT_SECRET) {
      diagnosticInfo.potentialIssues.push('GOOGLE_CLIENT_SECRET is not set');
    }

    // Validate required parameters
    if (!code) {
      console.error("Missing required code parameter");
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters', 
          diagnosticInfo 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!state) {
      console.error("Missing required state parameter");
      return new Response(
        JSON.stringify({ 
          error: 'Missing OAuth state parameter', 
          diagnosticInfo 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Missing OAuth credentials:", { 
        hasClientId: Boolean(GOOGLE_CLIENT_ID), 
        hasClientSecret: Boolean(GOOGLE_CLIENT_SECRET) 
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing Google OAuth credentials on server',
          diagnosticInfo 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log token request details with sensitive info masked
    console.log('Preparing token exchange request', {
      code_prefix: code.substring(0, 5) + '...',
      redirect_uri: effectiveRedirectUri,
      client_id_prefix: GOOGLE_CLIENT_ID.substring(0, 5) + '...',
      state_prefix: state.substring(0, 5) + '...',
    });

    // Exchange the authorization code for access and refresh tokens
    const tokenRequestBody = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: effectiveRedirectUri,
      grant_type: 'authorization_code',
    });

    console.log('Sending token request to Google...');
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Google token exchange error:', errorData);
      
      // Detailed error response
      return new Response(
        JSON.stringify({ 
          error: 'Failed to exchange token', 
          details: errorData,
          diagnosticInfo 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');
    
    return new Response(
      JSON.stringify({ 
        ...tokenData, 
        diagnosticInfo 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-auth-exchange function:', error);
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
