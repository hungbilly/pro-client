
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

serve(async (req) => {
  try {
    const { redirectUrl, state } = await req.json();

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({
          error: "Google OAuth credentials not configured",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate the redirect URL
    if (!redirectUrl) {
      return new Response(
        JSON.stringify({ error: "Missing redirect URL" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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

    return new Response(
      JSON.stringify({
        url: googleAuthUrl,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Google auth URL:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create Google auth URL",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
