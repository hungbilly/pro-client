
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
      .select('view_link, contract_terms, html_content, number, id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Found invoice with view link:', invoice.view_link);
    
    // Get the base URL from the request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    
    // Construct full URL for the invoice view
    const viewLink = invoice.view_link.includes('/') ? invoice.view_link.split('/').pop() : invoice.view_link;
    const invoiceUrl = `${baseUrl}/invoice/${viewLink}`;
    console.log('Invoice URL for client-side rendering:', invoiceUrl);
    
    // Return instruction to use client-side PDF generation
    return new Response(
      JSON.stringify({ 
        status: 'client-side', 
        message: 'Please use client-side PDF generation',
        invoiceUrl,
        invoiceNumber: invoice.number,
        invoiceId: invoice.id,
        hasContractTerms: !!invoice.contract_terms
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
