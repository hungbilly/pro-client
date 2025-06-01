
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('Callback received:', { hasCode: !!code, hasState: !!state, error });

    if (error) {
      console.error('OAuth error:', error);
      const redirectUrl = state ? JSON.parse(state).redirectTo : '/settings';
      return Response.redirect(`${redirectUrl}?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return new Response('Missing required parameters', { status: 400 });
    }

    const stateData = JSON.parse(state);
    console.log('State data:', stateData);

    if (!stateData.userId) {
      console.error('No user ID in state');
      return new Response('Invalid state parameter', { status: 400 });
    }

    // Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${SUPABASE_URL}/functions/v1/handle-google-calendar-callback`
    });

    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return new Response(`Token exchange failed: ${JSON.stringify(errorData)}`, { status: 400 });
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in 
    });

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Store or update integration in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const integrationData = {
      user_id: stateData.userId,
      provider: 'google_calendar',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || 'Bearer',
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Storing integration data for user:', stateData.userId);

    // Try to update existing integration first
    const { data: existingIntegration, error: fetchError } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', stateData.userId)
      .eq('provider', 'google_calendar')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing integration:', fetchError);
      throw fetchError;
    }

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('user_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id);

      if (updateError) {
        console.error('Error updating integration:', updateError);
        throw updateError;
      }
      console.log('Updated existing integration');
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('user_integrations')
        .insert(integrationData);

      if (insertError) {
        console.error('Error creating integration:', insertError);
        throw insertError;
      }
      console.log('Created new integration');
    }

    // Redirect back to the application
    const redirectUrl = stateData.redirectTo || '/settings';
    console.log('Redirecting to:', redirectUrl);
    
    return Response.redirect(`${redirectUrl}?success=calendar_connected`);

  } catch (error) {
    console.error('Error in Google Calendar callback:', error);
    return new Response(
      `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
      { status: 500, headers: corsHeaders }
    );
  }
});
