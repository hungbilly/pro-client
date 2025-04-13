
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log("Validating Google OAuth configuration...");
    
    // Get environment variables
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    // Check request info
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    
    // Default Supabase redirect URI
    const supabaseRedirectUri = `https://htjvyzmuqsrjpesdurni.supabase.co/auth/v1/callback`;
    
    // Full validation results
    const validation = {
      timestamp: new Date().toISOString(),
      clientId: {
        configured: Boolean(GOOGLE_CLIENT_ID),
        value: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 6)}...${GOOGLE_CLIENT_ID.substring(GOOGLE_CLIENT_ID.length - 4)}` : null,
        length: GOOGLE_CLIENT_ID?.length || 0,
        status: Boolean(GOOGLE_CLIENT_ID) ? 'ok' : 'missing'
      },
      clientSecret: {
        configured: Boolean(GOOGLE_CLIENT_SECRET),
        // Only show length for security
        length: GOOGLE_CLIENT_SECRET?.length || 0,
        status: Boolean(GOOGLE_CLIENT_SECRET) ? 'ok' : 'missing'
      },
      redirectUri: {
        configured: true, // Always true since we're using the default Supabase URI
        value: supabaseRedirectUri,
        status: 'ok'
      },
      requestInfo: {
        origin,
        referer
      },
      recommendations: []
    };
    
    // Add specific recommendations based on validation results
    if (!GOOGLE_CLIENT_ID) {
      validation.recommendations.push({
        priority: 'high',
        action: 'Set GOOGLE_CLIENT_ID in Supabase secrets',
        details: 'This is required for Google OAuth to work'
      });
    }
    
    if (!GOOGLE_CLIENT_SECRET) {
      validation.recommendations.push({
        priority: 'high',
        action: 'Set GOOGLE_CLIENT_SECRET in Supabase secrets',
        details: 'This is required for token exchange to work'
      });
    }
    
    // Add Google Cloud Console configuration tips
    validation.recommendations.push({
      priority: 'medium',
      action: 'Verify Google Cloud Console configuration',
      details: `Ensure your OAuth 2.0 client has this redirect URI added to Authorized redirect URIs: ${supabaseRedirectUri}`
    });
    
    // Overall status
    const allRequiredSecretsSet = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
    validation.overallStatus = allRequiredSecretsSet ? 'ready' : 'incomplete';
    
    return new Response(
      JSON.stringify(validation),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in validate-google-oauth function:', error);
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
