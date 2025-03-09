
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const COMPANY_CALENDAR_ID = Deno.env.get('COMPANY_CALENDAR_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://htjvyzmuqsrjpesdurni.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0anZ5em11cXNyanBlc2R1cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MDg0NTIsImV4cCI6MjA1Njk4NDQ1Mn0.AtFzj0Ail1PgKmXJcPWyWnXqC6EbMP0UOlH4m_rhkq8';

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
    
    if (!GOOGLE_API_KEY || !COMPANY_CALENDAR_ID) {
      console.error('Missing Google Calendar API credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error', 
          message: 'Google Calendar API credentials not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Insert event to Google Calendar
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${COMPANY_CALENDAR_ID}/events?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
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
