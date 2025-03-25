
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Supabase client setup
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
    const url = new URL(req.url);
    const viewLink = url.pathname.split('/').pop();
    
    if (!viewLink) {
      return new Response(
        JSON.stringify({ error: 'Invalid invoice link' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }
    
    console.log('Looking up invoice with view link:', viewLink);
    
    // First, get the invoice ID from the view link
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id')
      .eq('view_link', viewLink)
      .single();
    
    if (invoiceError || !invoice) {
      console.error('Error finding invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 404 
        }
      );
    }
    
    console.log('Found invoice ID:', invoice.id);
    
    // Now get the static HTML for this invoice
    const { data: staticHtml, error: htmlError } = await supabase
      .from('invoice_static_html')
      .select('html_content, generated_at')
      .eq('invoice_id', invoice.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (htmlError || !staticHtml) {
      console.error('Error retrieving static HTML:', htmlError);
      return new Response(
        JSON.stringify({ error: 'Static invoice content not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 404 
        }
      );
    }
    
    console.log('Serving static HTML for invoice, generated at:', staticHtml.generated_at);
    
    // Return the static HTML content with appropriate headers
    return new Response(staticHtml.html_content, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html' 
      },
      status: 200
    });
  } catch (error) {
    console.error('Error serving static invoice:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
