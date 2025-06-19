
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceAcceptanceRequest {
  invoiceId: string;
  acceptanceType: 'invoice' | 'contract';
  clientName?: string;
  acceptedBy?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('[handle-invoice-acceptance] Function invoked');
    
    const { invoiceId, acceptanceType, clientName, acceptedBy }: InvoiceAcceptanceRequest = await req.json();
    
    console.log('[handle-invoice-acceptance] Request data:', {
      invoiceId,
      acceptanceType,
      clientName: clientName || 'Not provided',
      acceptedBy: acceptedBy || 'Not provided'
    });

    // Create Supabase client with service role key for database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch invoice details with related client and company data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        number,
        amount,
        clients!inner(name),
        companies!inner(name, email, currency)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('[handle-invoice-acceptance] Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('[handle-invoice-acceptance] Invoice fetched:', {
      invoiceNumber: invoice.number,
      clientName: invoice.clients.name,
      companyName: invoice.companies.name,
      companyEmail: invoice.companies.email
    });

    // Prepare email notification data
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let templateName: string;
    let emailVariables: any;

    if (acceptanceType === 'contract') {
      templateName = 'contract_accepted_notification';
      emailVariables = {
        client_name: clientName || invoice.clients.name,
        invoice_number: invoice.number,
        accepted_by: acceptedBy || clientName || 'Client',
        acceptance_date: currentDate,
        company_name: invoice.companies.name || 'Your Company',
      };
    } else {
      // Format currency amount
      const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
        }).format(amount);
      };

      templateName = 'invoice_accepted_notification';
      emailVariables = {
        client_name: clientName || invoice.clients.name,
        invoice_number: invoice.number,
        invoice_amount: formatCurrency(invoice.amount, invoice.companies.currency || 'USD'),
        acceptance_date: currentDate,
        company_name: invoice.companies.name || 'Your Company',
      };
    }

    console.log('[handle-invoice-acceptance] Sending email with template:', templateName);
    console.log('[handle-invoice-acceptance] Email variables:', emailVariables);

    // Send email notification using the send-system-email function with service role auth
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-system-email', {
      body: {
        templateName,
        recipientEmail: invoice.companies.email,
        variables: emailVariables,
        category: 'notification'
      }
    });

    if (emailError) {
      console.error('[handle-invoice-acceptance] Error sending email:', emailError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email notification',
          details: emailError.message 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('[handle-invoice-acceptance] Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent successfully',
        emailResult 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('[handle-invoice-acceptance] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);
