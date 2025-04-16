import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Function to get a valid OAuth2 access token from the user's integration
async function getAccessToken(userId: string, authHeader: string | null) {
  try {
    // Check if environment variables are set
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials in environment variables:',
        { clientIdExists: Boolean(GOOGLE_CLIENT_ID), clientSecretExists: Boolean(GOOGLE_CLIENT_SECRET) });
      throw new Error('Missing Google OAuth2 credentials');
    }
    
    if (!userId) {
      throw new Error('User ID is required to access calendar integration');
    }
    
    console.log(`Looking for calendar integration for user: ${userId}`);
    
    // Create client with user's JWT if available, otherwise use service role key
    let supabase;
    if (authHeader) {
      // Create authenticated client using the user's JWT token
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: authHeader,
          }
        }
      });
      console.log('Created authenticated supabase client with user JWT');
    } else {
      // Fall back to service role key for admin operations
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log('Created supabase client with service role key');
    }
    
    // Get the user's Google Calendar integration
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Check if we got any results
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
    
    // Check if token needs refresh
    const expiresAt = new Date(integrationData.expires_at);
    const now = new Date();
    const expirationBuffer = 300000; // 5 minutes in milliseconds
    
    if (now.getTime() > expiresAt.getTime() - expirationBuffer) {
      // Token needs refresh
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
      
      // Update the token in the database
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);
      
      await supabase
        .from('user_integrations')
        .update({
          access_token: tokenData.access_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', integrationData.id);
        
      return tokenData.access_token;
    }
    
    // Current token is still valid
    console.log('Using existing valid token');
    return integrationData.access_token;
    
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract the authorization header for RLS to work
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', Boolean(authHeader));
    
    // Get request data
    const requestData = await req.json();
    const { jobId, clientId, invoiceId, testMode, testData, userId, userTimeZone } = requestData;
    
    console.log('Function called with:', { 
      hasJobId: Boolean(jobId),
      hasClientId: Boolean(clientId), 
      hasInvoiceId: Boolean(invoiceId),
      isTestMode: Boolean(testMode),
      hasTestData: Boolean(testData),
      userId,
      hasAuthHeader: Boolean(authHeader),
      userTimeZone
    });
    
    console.log('Full request payload:', JSON.stringify(requestData, null, 2));
    
    // Log timezone information
    const timezone = userTimeZone || 'UTC';
    console.log('User timezone from request:', timezone);
    console.log('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing user ID', 
          message: 'User ID is required to access calendar integration.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if ((!jobId && !invoiceId && !testMode) || (!testMode && !clientId)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with auth header if available
    let supabase;
    if (authHeader) {
      // Create authenticated client using the user's JWT token
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: authHeader,
          }
        }
      });
      console.log('Created authenticated supabase client with user JWT');
    } else {
      // Fall back to service role key for admin operations
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log('Created supabase client with service role key (fallback)');
    }
    
    // Check if the user has a valid integration
    let integrationExists = false;
    
    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'google_calendar')
        .limit(1);
        
      if (error) {
        console.error('Error checking for integration existence:', error);
        throw error;
      }
      
      integrationExists = !!(data && data.length > 0);
      
      if (integrationExists) {
        console.log(`Found calendar integration with ID: ${data[0].id}`);
      } else {
        console.log('No calendar integration found for user:', userId);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Calendar integration not set up', 
            message: 'Please set up your Google Calendar integration in the settings page first.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.error('Error checking for integration existence:', error);
      // Continue and let getAccessToken handle detailed errors
    }
    
    // Get access token using the provided userId
    let accessToken;
    try {
      accessToken = await getAccessToken(userId, authHeader);
      console.log('Got access token for calendar API');
    } catch (error: any) {
      // Return a clearer error message if no integration is found
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Calendar integration error', 
          message: error.message || 'Error accessing Google Calendar integration'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch data based on whether it's a test, job or invoice
    let eventData, clientData;
    
    if (testMode && testData) {
      // Use provided test data
      eventData = testData.event;
      clientData = testData.client;
      console.log('Using test data:', { event: eventData, client: clientData });
    } else {
      // Fetch real data from database
      if (jobId) {
        // Fetch job data from database with additional logging for timezone
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();
          
        if (jobError || !job) {
          console.error('Error fetching job:', jobError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch job data' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Job from database:', job);
        console.log('Job timezone from database:', job.timezone);
        console.log('Job start time from database:', job.start_time);
        console.log('Job end time from database:', job.end_time);
        eventData = job;
      } else if (invoiceId) {
        // Fetch invoice data
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();
          
        if (invoiceError || !invoice) {
          console.error('Error fetching invoice:', invoiceError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch invoice data' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        eventData = invoice;
      }
      
      // Fetch client data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
        
      if (clientError || !client) {
        console.error('Error fetching client:', clientError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch client data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      clientData = client;
    }
    
    // Determine event details based on the data source (job or invoice)
    let eventDate, eventStartTime, eventEndTime, eventSummary, eventLocation, eventDescription;
    
    if (jobId || testMode) {
      // Check if there's a job date
      if (!eventData.date) {
        return new Response(
          JSON.stringify({ success: false, message: 'No job date to add to calendar' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      eventDate = eventData.date; // e.g., "2025-04-14"
      
      // Get times directly from the event data - prioritize snake_case fields from API, fallback to camelCase
      // Add extra logging to debug time values
      console.log('Raw start time value:', eventData.start_time || eventData.startTime);
      console.log('Raw end time value:', eventData.end_time || eventData.endTime);
      
      // Set times, prioritizing snake_case fields (from database) over camelCase (from objects)
      eventStartTime = eventData.start_time || eventData.startTime || '09:00:00'; // e.g., "09:00:00"
      eventEndTime = eventData.end_time || eventData.endTime || '17:00:00'; // e.g., "17:00:00"
      
      console.log('Using event start time:', eventStartTime);
      console.log('Using event end time:', eventEndTime);
      
      // For all-day events
      const isFullDay = eventData.is_full_day === true || eventData.isFullDay === true;
      
      eventSummary = `${eventData.title} - ${clientData.name}`; // "ggg - Test Client"
      eventLocation = eventData.location || clientData.address; // "123 Test Street"
      eventDescription = `${eventData.description || 'Job session'} for ${clientData.name}.\n\nClient Contact:\nEmail: ${clientData.email}\nPhone: ${clientData.phone}`;
      
      // Get the user's timezone (prioritize job timezone, then explicit userTimeZone, then fallback to UTC)
      const userTimeZone = eventData.timezone || timezone || 'UTC';
      console.log(`Using timezone from prioritization: ${userTimeZone} for event creation`);
      console.log(`Job timezone: ${eventData.timezone}, Request timezone: ${timezone}`);
      
      // Format date/time for Google Calendar
      if (isFullDay) {
        // Format as YYYY-MM-DD for all-day events
        const startDate = eventDate;
        
        // Create event object for all-day event (no time component)
        const event = {
          summary: eventSummary,
          location: eventLocation,
          description: eventDescription,
          start: {
            date: startDate, // "2025-04-14"
          },
          end: {
            date: startDate, // "2025-04-14"
          },
        };
        
        console.log('Creating all-day event with data:', JSON.stringify(event));
        
        // Insert event to Google Calendar using OAuth2 access token
        const calendarResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );
        
        // Log the full response for debugging
        const responseText = await calendarResponse.text();
        console.log(`Google Calendar API response status: ${calendarResponse.status}`);
        console.log(`Google Calendar API response body: ${responseText}`);
        
        if (!calendarResponse.ok) {
          let errorDetails;
          try {
            errorDetails = JSON.parse(responseText);
          } catch (e) {
            errorDetails = { rawText: responseText };
          }
          
          console.error('Google Calendar API error:', errorDetails);
          return new Response(
            JSON.stringify({ error: 'Failed to create calendar event', details: errorDetails }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const calendarData = await JSON.parse(responseText);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Event added to company calendar',
            eventId: calendarData.id
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Ensure startTime and endTime include seconds
        const normalizedStartTime = eventStartTime.length === 5 ? `${eventStartTime}:00` : eventStartTime; // "09:00:00"
        const normalizedEndTime = eventEndTime.length === 5 ? `${eventEndTime}:00` : eventEndTime; // "17:00:00"
        
        // Format dates for event creation
        const formattedStartDate = `${eventDate}T${normalizedStartTime}`;
        const formattedEndDate = `${eventDate}T${normalizedEndTime}`;
        
        console.log('Formatted start dateTime:', formattedStartDate);
        console.log('Formatted end dateTime:', formattedEndDate);
        
        // Create event object with start/end times and proper timezone
        const event = {
          summary: eventSummary,
          location: eventLocation,
          description: eventDescription,
          start: {
            dateTime: formattedStartDate,
            timeZone: userTimeZone,
          },
          end: {
            dateTime: formattedEndDate,
            timeZone: userTimeZone,
          },
        };
        
        console.log('Creating event with data:', JSON.stringify(event));
        console.log('Event timezone used:', userTimeZone);
        
        // Insert event to Google Calendar using OAuth2 access token
        const calendarResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );
        
        // Log the full response for debugging
        const responseText = await calendarResponse.text();
        console.log(`Google Calendar API response status: ${calendarResponse.status}`);
        console.log(`Google Calendar API response body: ${responseText}`);
        
        if (!calendarResponse.ok) {
          let errorDetails;
          try {
            errorDetails = JSON.parse(responseText);
          } catch (e) {
            errorDetails = { rawText: responseText };
          }
          
          console.error('Google Calendar API error:', errorDetails);
          return new Response(
            JSON.stringify({ error: 'Failed to create calendar event', details: errorDetails }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const calendarData = await JSON.parse(responseText);
        console.log('Successfully created event:', calendarData.id);
        
        // If the event was created successfully and we have a real jobId (not test mode),
        // update the job in the database with the calendar_event_id
        if (!testMode && jobId && calendarData.id) {
          try {
            const { error: updateError } = await supabase
              .from('jobs')
              .update({ calendar_event_id: calendarData.id })
              .eq('id', jobId);
            
            if (updateError) {
              console.error('Failed to update job with calendar event ID:', updateError);
            } else {
              console.log('Successfully updated job with calendar event ID');
            }
          } catch (updateError) {
            console.error('Exception updating job with calendar event ID:', updateError);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Event added to company calendar',
            eventId: calendarData.id
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (invoiceId) {
      // Check if there's a shooting date
      if (!eventData.shooting_date) {
        return new Response(
          JSON.stringify({ success: false, message: 'No shooting date to add to calendar' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Format shooting date (YYYY-MM-DD to RFC3339 format)
      const shootingDate = new Date(eventData.shooting_date);
      const formattedStartDate = `${shootingDate.toISOString().split('T')[0]}T09:00:00`; // Default to 9 AM
      const formattedEndDate = `${shootingDate.toISOString().split('T')[0]}T17:00:00`;   // Default to 5 PM
      
      // Get the user's timezone (fallback to UTC)
      const userTimeZone = timezone;
      
      // Create event object
      const event = {
        summary: `Photo Shoot - ${clientData.name} - Invoice #${eventData.number}`,
        location: clientData.address,
        description: `Photo shooting session for ${clientData.name}.\n\nClient Contact:\nEmail: ${clientData.email}\nPhone: ${clientData.phone}\n\nInvoice #${eventData.number}`,
        start: {
          dateTime: formattedStartDate,
          timeZone: userTimeZone,
        },
        end: {
          dateTime: formattedEndDate,
          timeZone: userTimeZone,
        },
      };
      
      console.log('Creating event with data:', JSON.stringify(event));
      
      // Insert event to Google Calendar using OAuth2 access token
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );
      
      if (!calendarResponse.ok) {
        const errorData = await calendarResponse.json();
        console.error('Google Calendar API error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to create calendar event', details: errorData }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const calendarData = await calendarResponse.json();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Event added to company calendar',
          eventId: calendarData.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Should not reach here, but provide a fallback response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid operation', 
        message: 'The requested operation could not be performed.' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in add-to-calendar function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
