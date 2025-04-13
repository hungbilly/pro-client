import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://htjvyzmuqsrjpesdurni.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0anZ5em11cXNyanBlc2R1cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDg0NTIsImV4cCI6MjA1Njk4NDQ1Mn0.AtFzj0Ail1PgKmXJcPWyWnXqC6EbMP0UOlH4m_rhkq8';

// Function to get a valid OAuth2 access token using user's integration
async function getAccessToken(userId) {
  try {
    // Check if environment variables are set
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials in environment variables:',
        { clientIdExists: Boolean(GOOGLE_CLIENT_ID), clientSecretExists: Boolean(GOOGLE_CLIENT_SECRET) });
      throw new Error('Missing Google OAuth2 credentials');
    }
    
    // Initialize Supabase client for getting user data
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get the user's integration data - don't use single() here to avoid PGRST116 error
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('provider', 'google_calendar')
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Check if we got any results
    if (error) {
      console.error('Error fetching user integration:', error);
      throw new Error('Error fetching Google Calendar integration');
    }
    
    if (!data || data.length === 0 || !data[0].refresh_token) {
      console.error('No integration or refresh token found');
      throw new Error('No Google Calendar integration found. Please connect your Google Calendar account first.');
    }
    
    const integrationData = data[0];
    
    console.log('Retrieved integration data:', { 
      hasAccessToken: Boolean(integrationData.access_token),
      hasRefreshToken: Boolean(integrationData.refresh_token),
      expiresAt: integrationData.expires_at
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
    // Get request data
    const { jobId, clientId, invoiceId, testMode, testData, userId } = await req.json();
    
    if ((!jobId && !invoiceId && !testMode) || (!testMode && !clientId)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
      // Get access token - pass userId if provided
      const accessToken = await getAccessToken(userId);
      console.log('Got access token for calendar API');
    } catch (error) {
      // Return a clearer error message if no integration is found
      if (error.message && error.message.includes('No Google Calendar integration found')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Calendar integration not set up', 
            message: 'Please set up your Google Calendar integration in the settings page first.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For other errors, return the original error
      throw error;
    }
    
    // Fetch data based on whether it's a test, job or invoice
    let eventData, clientData;
    
    // ... keep existing code (fetching job/invoice/client data)
    if (testMode && testData) {
      // Use provided test data
      eventData = testData.event;
      clientData = testData.client;
      console.log('Using test data:', { event: eventData, client: clientData });
    } else {
      // Fetch real data from database
      if (jobId) {
        // Fetch job data
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
    
    // ... keep existing code (determining event details and Google Calendar API interaction)
    
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
      
      eventDate = eventData.date;
      
      // Set default times if not specified
      eventStartTime = eventData.startTime || '09:00:00';
      eventEndTime = eventData.endTime || '17:00:00';
      
      // For all-day events
      const isFullDay = eventData.isFullDay === true;
      
      eventSummary = `${eventData.title} - ${clientData.name}`;
      eventLocation = eventData.location || clientData.address;
      eventDescription = `${eventData.description || 'Job session'} for ${clientData.name}.\n\nClient Contact:\nEmail: ${clientData.email}\nPhone: ${clientData.phone}`;
      
      // Format date/time for Google Calendar
      // For full-day events, we use date only format
      if (isFullDay) {
        // Format as YYYY-MM-DD for all-day events
        const startDate = eventDate;
        
        // Create event object for all-day event (no time component)
        const event = {
          summary: eventSummary,
          location: eventLocation,
          description: eventDescription,
          start: {
            date: startDate,
            timeZone: 'UTC',
          },
          end: {
            date: startDate, // Same day end for a single day event
            timeZone: 'UTC',
          },
        };
        
        // Get fresh access token for Google Calendar API
        const accessToken = await getAccessToken(userId);
        console.log('Got access token for calendar API');
        
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
      } else {
        // Format start and end times for non-full-day events
        const formattedStartDate = `${eventDate}T${eventStartTime}-00:00`;
        const formattedEndDate = `${eventDate}T${eventEndTime}-00:00`;
        
        // Create event object with start/end times
        const event = {
          summary: eventSummary,
          location: eventLocation,
          description: eventDescription,
          start: {
            dateTime: formattedStartDate,
            timeZone: 'UTC',
          },
          end: {
            dateTime: formattedEndDate,
            timeZone: 'UTC',
          },
        };
        
        // Get fresh access token for Google Calendar API
        const accessToken = await getAccessToken(userId);
        console.log('Got access token for calendar API');
        
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
      const formattedStartDate = `${shootingDate.toISOString().split('T')[0]}T09:00:00-00:00`; // Default to 9 AM
      const formattedEndDate = `${shootingDate.toISOString().split('T')[0]}T17:00:00-00:00`;   // Default to 5 PM
      
      // Create event object
      const event = {
        summary: `Photo Shoot - ${clientData.name} - Invoice #${eventData.number}`,
        location: clientData.address,
        description: `Photo shooting session for ${clientData.name}.\n\nClient Contact:\nEmail: ${clientData.email}\nPhone: ${clientData.phone}\n\nInvoice #${eventData.number}`,
        start: {
          dateTime: formattedStartDate,
          timeZone: 'UTC',
        },
        end: {
          dateTime: formattedEndDate,
          timeZone: 'UTC',
        },
      };
      
      // Get fresh access token for Google Calendar API
      const accessToken = await getAccessToken(userId);
      console.log('Got access token for calendar API');
      
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
    
  } catch (error) {
    console.error('Error in add-to-calendar function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
