
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
    // Parse the URL and extract query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const redirectTo = url.searchParams.get("redirect_to") || "/settings";
    const error = url.searchParams.get("error");
    
    if (error) {
      console.error("Google OAuth error:", error);
      // Redirect to the frontend with error information
      return new Response("", {
        status: 302,
        headers: {
          Location: `${redirectTo}?error=${encodeURIComponent(error)}&source=calendar`,
        },
      });
    }
    
    if (!code || !stateParam) {
      console.error("Missing code or state parameter");
      return new Response("", {
        status: 302,
        headers: {
          Location: `${redirectTo}?error=${encodeURIComponent("Missing required parameters")}&source=calendar`,
        },
      });
    }
    
    // Parse the state parameter to get user ID
    let parsedState: { userId?: string; purpose?: string };
    try {
      parsedState = JSON.parse(stateParam);
    } catch (e) {
      console.error("Invalid state parameter:", e);
      return new Response("", {
        status: 302,
        headers: {
          Location: `${redirectTo}?error=${encodeURIComponent("Invalid state parameter")}&source=calendar`,
        },
      });
    }
    
    const { userId, purpose } = parsedState;
    
    if (!userId || purpose !== "calendar_integration") {
      console.error("Invalid or missing userId in state parameter");
      return new Response("", {
        status: 302,
        headers: {
          Location: `${redirectTo}?error=${encodeURIComponent("Invalid request state")}&source=calendar`,
        },
      });
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${SUPABASE_URL}/functions/v1/handle-google-calendar-callback`,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error("Error exchanging code for tokens:", tokenData);
      return new Response("", {
        status: 302,
        headers: {
          Location: `${redirectTo}?error=${encodeURIComponent("Failed to exchange authorization code")}&source=calendar`,
        },
      });
    }

    const { access_token, refresh_token, expires_in, token_type } = tokenData;

    if (!access_token) {
      console.error("No access token received");
      return new Response("", {
        status: 302,
        headers: {
          Location: `${redirectTo}?error=${encodeURIComponent("No access token received")}&source=calendar`,
        },
      });
    }

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // Create a Supabase client with the service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Store the tokens in the database
    const { error: dbError } = await supabase
      .from("user_integrations")
      .upsert({
        user_id: userId,
        provider: "google_calendar",
        access_token,
        refresh_token,
        token_type,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: "user_id,provider" });

    if (dbError) {
      console.error("Database error storing tokens:", dbError);
      return new Response("", {
        status: 302,
        headers: {
          Location: `${redirectTo}?error=${encodeURIComponent("Failed to store integration")}&source=calendar`,
        },
      });
    }

    // Redirect back to the application with success message
    return new Response("", {
      status: 302,
      headers: {
        Location: `${redirectTo}?success=true&source=calendar`,
      },
    });
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    return new Response("", {
      status: 302,
      headers: {
        Location: `/settings?error=${encodeURIComponent("Internal server error")}&source=calendar`,
      },
    });
  }
});
