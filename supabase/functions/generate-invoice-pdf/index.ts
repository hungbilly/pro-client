
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { invoiceId } = await req.json();
    console.log('Received request to generate PDF for invoice:', invoiceId);
    
    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: invoiceId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch the invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id, 
        number, 
        date, 
        due_date, 
        amount, 
        notes, 
        status, 
        view_link, 
        contract_terms, 
        contract_status,
        client_id,
        company_id
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch the invoice items
    const { data: invoiceItems, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
    }

    // Fetch payment schedules if any
    const { data: paymentSchedules, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
    }

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
    }

    // Fetch company details
    const { data: company, error: companyError } = await supabase
      .from('company_clientview')
      .select('*')
      .eq('company_id', invoice.company_id)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
    }

    console.log('Found invoice with view link:', invoice.view_link);
    console.log('Invoice has contract terms:', !!invoice.contract_terms);
    console.log('Contract status:', invoice.contract_status);
    console.log('Contract terms length:', invoice.contract_terms ? invoice.contract_terms.length : 0);
    
    // Get the base URL from the request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    
    // Construct full URL for the invoice view
    const viewLink = invoice.view_link.includes('/') ? invoice.view_link.split('/').pop() : invoice.view_link;
    const invoiceUrl = `${baseUrl}/invoice/${viewLink}`;
    
    // For now, return the collected data for client-side PDF generation
    return new Response(
      JSON.stringify({ 
        status: 'client-side', 
        message: 'Please use client-side PDF generation',
        invoiceUrl,
        invoiceNumber: invoice.number,
        invoiceId: invoice.id,
        hasContractTerms: !!invoice.contract_terms,
        contractStatus: invoice.contract_status,
        contractTermsLength: invoice.contract_terms ? invoice.contract_terms.length : 0,
        invoiceData: {
          invoice: {
            ...invoice,
            dateFormatted: new Date(invoice.date).toLocaleDateString(),
            dueDateFormatted: new Date(invoice.due_date).toLocaleDateString()
          },
          items: invoiceItems || [],
          paymentSchedules: paymentSchedules || [],
          client: client || null,
          company: company || null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
