
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const GOOGLE_REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://htjvyzmuqsrjpesdurni.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0anZ5em11cXNyanBlc2R1cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDg0NTIsImV4cCI6MjA1Njk4NDQ1Mn0.AtFzj0Ail1PgKmXJcPWyWnXqC6EbMP0UOlH4m_rhkq8';

// Function to get a valid OAuth2 access token using refresh token
async function getAccessToken() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing Google OAuth2 credentials');
  }
  
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
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
    console.error('OAuth token error:', errorData);
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request data
    const { invoiceId, clientId } = await req.json();
    
    if (!invoiceId || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
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
    
    // Check if there's a shooting date
    if (!invoice.shooting_date) {
      return new Response(
        JSON.stringify({ success: false, message: 'No shooting date to add to calendar' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Format shooting date (YYYY-MM-DD to RFC3339 format)
    const shootingDate = new Date(invoice.shooting_date);
    const formattedStartDate = `${shootingDate.toISOString().split('T')[0]}T09:00:00-00:00`; // Default to 9 AM
    const formattedEndDate = `${shootingDate.toISOString().split('T')[0]}T17:00:00-00:00`;   // Default to 5 PM
    
    // Create event object
    const event = {
      summary: `Photo Shoot - ${client.name} - Invoice #${invoice.number}`,
      location: client.address,
      description: `Photo shooting session for ${client.name}.\n\nClient Contact:\nEmail: ${client.email}\nPhone: ${client.phone}\n\nInvoice #${invoice.number}`,
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
    let accessToken;
    try {
      accessToken = await getAccessToken();
    } catch (error) {
      console.error('Error getting access token:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication error', 
          message: 'Failed to authenticate with Google Calendar' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
    
  } catch (error) {
    console.error('Error in add-to-calendar function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
