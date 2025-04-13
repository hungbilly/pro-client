
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
          details: e.message
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { redirectUrl, state } = body;

    // Check for required environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Missing Google OAuth credentials");
      return new Response(
        JSON.stringify({
          error: "Google OAuth credentials not configured",
          details: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables are not set"
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Validate the redirect URL
    if (!redirectUrl) {
      console.error("Missing redirect URL");
      return new Response(
        JSON.stringify({ 
          error: "Missing redirect URL",
          details: "The redirectUrl parameter is required" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate state parameter
    if (!state) {
      console.error("Missing state parameter");
      return new Response(
        JSON.stringify({ 
          error: "Missing state parameter",
          details: "The state parameter is required for security purposes" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Google OAuth URL for Calendar specific scopes
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];
    
    // We use encodeURIComponent properly for each parameter
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${SUPABASE_URL}/functions/v1/handle-google-calendar-callback`,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: state,
    });
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
    console.log("Generated Google auth URL, redirecting to:", googleAuthUrl.substring(0, 100) + "...");

    return new Response(
      JSON.stringify({
        url: googleAuthUrl,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error creating Google auth URL:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create Google auth URL",
        stack: error.stack || "No stack trace available"
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
