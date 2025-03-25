
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/html'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const viewLink = url.pathname.split('/').pop();
    
    if (!viewLink) {
      return new Response('Invalid view link', { status: 400, headers: corsHeaders });
    }
    
    console.log(`Looking up static invoice with view link: ${viewLink}`);
    
    // Initialize Supabase client with ENV vars
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try to get the static HTML from clientview_invoice
    const { data: staticInvoice, error: staticInvoiceError } = await supabase
      .from('clientview_invoice')
      .select('html_content')
      .eq('view_link', viewLink)
      .single();
    
    if (staticInvoiceError || !staticInvoice) {
      console.error(`Error fetching static invoice HTML:`, staticInvoiceError);
      
      // If no static HTML exists, try to get the invoice details
      // and return a redirect to the invoice view page
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id')
        .eq('view_link', viewLink)
        .single();
      
      if (invoiceError || !invoice) {
        console.error(`Error fetching invoice:`, invoiceError);
        return new Response('Invoice not found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }
      
      console.log(`No static HTML found, redirecting to invoice view: ${invoice.id}`);
      
      // Return a redirect to the normal invoice view
      return new Response('Redirecting to invoice view...', {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `/invoice/${viewLink}`
        }
      });
    }
    
    console.log(`Serving static HTML for invoice with view link: ${viewLink}`);
    
    // Return the static HTML content
    return new Response(staticInvoice.html_content, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error(`Error in serve-static-invoice:`, error);
    return new Response(`Server Error: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
