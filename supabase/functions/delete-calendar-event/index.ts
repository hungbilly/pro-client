
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://htjvyzmuqsrjpesdurni.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0anZ5em11cXNyanBlc2R1cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDg0NTIsImV4cCI6MjA1Njk4NDQ1Mn0.AtFzj0Ail1PgKmXJcPWyWnXqC6EbMP0UOlH4m_rhkq8';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Function to decode JWT without verification
function decodeJWT(token: string) {
  try {
    const base64Payload = token.split('.')[1];
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch (e) {
    console.error('Error decoding JWT:', e);
    return null;
  }
}

// Log token information with masking for security
function logTokenDetails(authHeader: string | null) {
  if (!authHeader) {
    console.log('No Authorization header present');
    return;
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const maskedToken = token.length > 10 
      ? `${token.substring(0, 5)}...${token.substring(token.length - 5)}`
      : '(invalid token format)';
    
    console.log(`Auth token present (masked): ${maskedToken}`);
    console.log(`Token length: ${token.length} characters`);
    
    const decodedToken = decodeJWT(token);
    if (decodedToken) {
      console.log('JWT structure:');
      console.log('- iss:', decodedToken.iss || 'missing');
      console.log('- aud:', decodedToken.aud || 'missing');
      console.log('- sub:', decodedToken.sub ? `${decodedToken.sub.substring(0, 5)}...` : 'missing');
      console.log('- exp present:', !!decodedToken.exp);
      console.log('- iat present:', !!decodedToken.iat);
      
      if (decodedToken.exp) {
        const now = Math.floor(Date.now() / 1000);
        const isExpired = decodedToken.exp < now;
        console.log(`- Token ${isExpired ? 'EXPIRED' : 'valid'} (expires ${new Date(decodedToken.exp * 1000).toISOString()})`);
        console.log(`- Current time: ${new Date(now * 1000).toISOString()}`);
      }
      
      const missingFields = [];
      ['iss', 'sub', 'aud', 'exp', 'iat'].forEach(field => {
        if (!decodedToken[field]) missingFields.push(field);
      });
      
      if (missingFields.length > 0) {
        console.log(`- Warning: Missing standard JWT fields: ${missingFields.join(', ')}`);
      }
      
      // If we have a sub field, try to extract the user ID
      if (decodedToken.sub) {
        console.log('- User ID from token:', decodedToken.sub);
        return decodedToken.sub;
      }
    } else {
      console.log('Could not decode JWT - invalid format');
    }
    return null;
  } catch (e) {
    console.error('Error analyzing auth token:', e);
    return null;
  }
}

async function getAccessToken(userId: string, supabase: any) {
  try {
    console.log('Starting getAccessToken for user:', userId);
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials in environment variables:', {
        clientIdExists: Boolean(GOOGLE_CLIENT_ID),
        clientSecretExists: Boolean(GOOGLE_CLIENT_SECRET),
      });
      throw new Error('Missing Google OAuth2 credentials');
    }

    if (!userId) {
      throw new Error('User ID is required to access calendar integration');
    }

    console.log(`Looking for calendar integration for user: ${userId}`);

    const { data, error } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "google_calendar")
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching user integration:', error);
      throw new Error('Error fetching Google Calendar integration');
    }

    console.log('Query result:', { dataLength: data?.length, data });

    if (!data || data.length === 0) {
      console.error('No integration found for user:', userId);
      throw new Error('No Google Calendar integration found. Please connect your Google Calendar account first.');
    }

    const integrationData = data[0];

    if (!integrationData.refresh_token) {
      console.error('Found integration but missing refresh token for user:', userId);
      throw new Error('Invalid Google Calendar integration. Please reconnect your Google Calendar account.');
    }

    console.log('Retrieved integration data:', {
      integrationId: integrationData.id,
      hasAccessToken: Boolean(integrationData.access_token),
      hasRefreshToken: Boolean(integrationData.refresh_token),
      expiresAt: integrationData.expires_at,
      userId: integrationData.user_id
    });

    const expiresAt = new Date(integrationData.expires_at);
    const now = new Date();
    const expirationBuffer = 300000; // 5 minutes in milliseconds

    if (now.getTime() > expiresAt.getTime() - expirationBuffer) {
      console.log('Token expired, refreshing...');

      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: integrationData.refresh_token,
        grant_type: 'refresh_token'
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OAuth token refresh error:', errorData);
        throw new Error('Failed to refresh access token');
      }

      const tokenData = await response.json();

      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);

      await supabase
        .from('user_integrations')
        .update({
          access_token: tokenData.access_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', integrationData.id);

      console.log('Token refreshed successfully, returning new access token');
      return tokenData.access_token;
    }

    console.log('Using existing valid token');
    return integrationData.access_token;
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    throw error;
  }
}

serve(async (req) => {
  console.log('delete-calendar-event function invoked');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request (CORS preflight)');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', Boolean(authHeader));
    
    // Try to extract user ID from token if possible
    let tokenUserId = null;
    if (authHeader) {
      tokenUserId = logTokenDetails(authHeader);
      console.log('User ID extracted from token:', tokenUserId);
    }

    // Create a service role client for admin operations
    const adminClient = createClient(
      SUPABASE_URL, 
      SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Create a client with the auth header for user operations
    let supabase = adminClient;
    if (authHeader) {
      console.log('Creating authenticated client with provided auth header');
      supabase = createClient(
        SUPABASE_URL, 
        SUPABASE_ANON_KEY, 
        {
          global: {
            headers: {
              Authorization: authHeader,
            }
          }
        }
      );
    }
    
    let userId = tokenUserId; // Start with the user ID from the token if available
    let requestData;
    
    try {
      requestData = await req.json();
      console.log('Received request data:', requestData);
      
      const { eventId, jobId, userId: providedUserId } = requestData;
      
      // If userId wasn't found in token but is provided in request body, use that
      if (!userId && providedUserId) {
        console.log('Using userId from request body:', providedUserId);
        userId = providedUserId;
      }
      
      if (!eventId) {
        console.error('Missing event ID in request');
        return new Response(
          JSON.stringify({ error: 'Missing event ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If we still don't have a user ID, try to get it from auth
    if (!userId && authHeader) {
      try {
        console.log('Attempting to get user from auth header');
        // Use the admin client to try get the user ID directly from the JWT token
        const jwtPayload = decodeJWT(authHeader.replace('Bearer ', ''));
        if (jwtPayload?.sub) {
          console.log('Successfully extracted user ID from JWT payload:', jwtPayload.sub);
          userId = jwtPayload.sub;
        } else {
          console.warn('Could not extract user ID from JWT payload');
        }
      } catch (authError) {
        console.error('Exception during authentication with header:', authError);
      }
    }
    
    // As a last resort, if we have a job ID, try to get the user ID from the job
    if (!userId && requestData?.jobId) {
      try {
        console.log('Attempting to get user ID from job record');
        const { data: jobData, error: jobError } = await adminClient
          .from('jobs')
          .select('user_id')
          .eq('id', requestData.jobId)
          .single();
          
        if (jobError) {
          console.error('Error fetching job:', jobError);
        } else if (jobData?.user_id) {
          console.log('Successfully retrieved user ID from job:', jobData.user_id);
          userId = jobData.user_id;
        }
      } catch (jobError) {
        console.error('Exception fetching job data:', jobError);
      }
    }
    
    if (!userId) {
      console.error('No user ID available from any source');
      return new Response(
        JSON.stringify({ 
          error: "Failed to authenticate user", 
          details: "No user ID available",
          authHeaderPresent: Boolean(authHeader)
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Using user ID: ${userId}`);
    console.log(`Attempting to delete calendar event with ID: ${requestData.eventId}`);

    let accessToken;
    try {
      accessToken = await getAccessToken(userId, adminClient);
      console.log('Successfully acquired access token');
    } catch (tokenError) {
      console.error('Failed to get access token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to get access token', details: tokenError instanceof Error ? tokenError.message : String(tokenError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Calling Google Calendar API to delete event: ${requestData.eventId}`);
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${requestData.eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    console.log('Google Calendar API response status:', calendarResponse.status);
    
    if (!calendarResponse.ok) {
      let errorText = 'Failed to delete calendar event';
      try {
        const errorData = await calendarResponse.json();
        console.error('Google Calendar API error:', errorData);
        errorText = errorData.error?.message || errorText;
      } catch (e) {
        errorText = calendarResponse.statusText;
      }
      
      console.error(`Google Calendar API error: ${errorText} (Status: ${calendarResponse.status})`);
      return new Response(
        JSON.stringify({ error: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Successfully deleted event from Google Calendar');
    
    if (requestData.jobId) {
      try {
        console.log(`Updating job ${requestData.jobId} to remove calendar_event_id`);
        const { error: updateError } = await adminClient
          .from('jobs')
          .update({ calendar_event_id: null })
          .eq('id', requestData.jobId);
        
        if (updateError) {
          console.error('Error updating job:', updateError);
        } else {
          console.log('Successfully removed calendar event ID from job');
        }
      } catch (error) {
        console.error('Error updating job:', error);
      }
    }
    
    console.log('Returning success response');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event deleted from calendar'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in delete-calendar-event function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
