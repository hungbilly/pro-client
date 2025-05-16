
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';
import { addPaymentMethodsToTemplate } from './include-payment-methods.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  invoiceId: string;
  forceRegenerate?: boolean;
  debugMode?: boolean;
  clientInfo?: {
    userAgent?: string;
    timestamp?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestData: RequestBody = await req.json();
    const { invoiceId, forceRegenerate = false, debugMode = false, clientInfo = {} } = requestData;

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing invoice PDF generation for invoice ID: ${invoiceId}`);
    console.log(`Force regenerate: ${forceRegenerate}, Debug mode: ${debugMode}`);
    console.log(`Client info:`, clientInfo);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we already have a PDF URL
    if (!forceRegenerate) {
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('pdf_url')
        .eq('id', invoiceId)
        .single();

      if (fetchError) {
        console.error('Error fetching invoice:', fetchError);
      } else if (existingInvoice?.pdf_url) {
        console.log('Using existing PDF URL:', existingInvoice.pdf_url);
        return new Response(
          JSON.stringify({ pdfUrl: existingInvoice.pdf_url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:client_id(*),
        company:company_id(*),
        job:job_id(*),
        invoice_items:invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice data:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch invoice data', details: invoiceError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch payment schedules if they exist
    const { data: paymentSchedules, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('due_date', { ascending: true });

    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
    }

    // Fetch company client view data for additional display settings
    const { data: companyData, error: companyError } = await supabase
      .from('company_clientview')
      .select('*')
      .eq('company_id', invoice.company_id)
      .single();

    if (companyError) {
      console.error('Error fetching company client view data:', companyError);
    }

    console.log('[DEBUG] Fetched company data from company_clientview:', companyData);

    // Generate HTML for the invoice
    let htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.number}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 60px; /* Increased padding for more margin */
            color: #333;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          .company-logo {
            max-width: 200px;
            max-height: 80px;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .invoice-details {
            margin-bottom: 30px;
          }
          .invoice-details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .invoice-details-column {
            flex: 1;
          }
          .label {
            font-weight: bold;
            margin-bottom: 5px;
            color: #666;
          }
          .value {
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .amount-column {
            text-align: right;
          }
          .total-row {
            font-weight: bold;
          }
          .notes {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .contract-terms {
            page-break-before: always; /* Force contract to start on new page */
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .payment-schedule {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .payment-methods {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            white-space: pre-line;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-draft {
            background-color: #f2f2f2;
            color: #666;
          }
          .status-sent {
            background-color: #e3f2fd;
            color: #1976d2;
          }
          .status-accepted {
            background-color: #e8f5e9;
            color: #388e3c;
          }
          .status-paid {
            background-color: #f3e5f5;
            color: #7b1fa2;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div>
              ${companyData?.logo_url ? `<img src="${companyData.logo_url}" alt="Company Logo" class="company-logo">` : ''}
              <div style="margin-top: 10px;">
                <div style="font-weight: bold;">${invoice.company?.name || 'Company'}</div>
                ${invoice.company?.email ? `<div>${invoice.company.email}</div>` : ''}
                ${invoice.company?.phone ? `<div>${invoice.company.phone}</div>` : ''}
                ${invoice.company?.address ? `<div>${invoice.company.address}</div>` : ''}
              </div>
            </div>
            <div>
              <div class="invoice-title">INVOICE #${invoice.number}</div>
              <div>Date: ${new Date(invoice.date).toLocaleDateString()}</div>
              <div>Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</div>
              <div style="margin-top: 10px;">
                <span class="status-badge status-${invoice.status.toLowerCase()}">
                  ${invoice.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div class="invoice-details-row">
            <div class="invoice-details-column">
              <div class="label">BILL TO</div>
              <div class="value">
                <div style="font-weight: bold;">${invoice.client?.name || 'Client'}</div>
                ${invoice.client?.email ? `<div>${invoice.client.email}</div>` : ''}
                ${invoice.client?.phone ? `<div>${invoice.client.phone}</div>` : ''}
                ${invoice.client?.address ? `<div>${invoice.client.address}</div>` : ''}
              </div>
            </div>
            <div class="invoice-details-column">
              ${invoice.job?.title ? `
                <div class="label">PROJECT</div>
                <div class="value">${invoice.job.title}</div>
              ` : ''}
              ${invoice.job?.date ? `
                <div class="label">JOB DATE</div>
                <div class="value">${invoice.job.date}</div>
              ` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th class="amount-column">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.invoice_items.map(item => {
                // Add null checks and default values for rate and amount
                const rate = typeof item.rate === 'number' ? item.rate.toFixed(2) : '0.00';
                const amount = typeof item.amount === 'number' ? item.amount.toFixed(2) : '0.00';
                return `
                  <tr>
                    <td>${item.name || 'Item'}</td>
                    <td>${item.description || ''}</td>
                    <td>${item.quantity || 1}</td>
                    <td>$${rate}</td>
                    <td class="amount-column">$${amount}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Total</td>
                <td class="amount-column">$${typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : '0.00'}</td>
              </tr>
            </tbody>
          </table>

          ${invoice.notes ? `
            <div class="notes">
              <div class="label">NOTES</div>
              <div>${invoice.notes}</div>
            </div>
          ` : ''}

          ${paymentSchedules && paymentSchedules.length > 0 ? `
            <div class="payment-schedule">
              <div class="label">PAYMENT SCHEDULE</div>
              <table>
                <thead>
                  <tr>
                    <th>Due Date</th>
                    <th>Description</th>
                    <th class="amount-column">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentSchedules.map(schedule => `
                    <tr>
                      <td>${new Date(schedule.due_date).toLocaleDateString()}</td>
                      <td>${schedule.description || 'Payment'}</td>
                      <td class="amount-column">$${typeof schedule.amount === 'number' ? schedule.amount.toFixed(2) : '0.00'}</td>
                      <td>${schedule.status.toUpperCase()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${companyData?.payment_methods ? `
            <div class="payment-methods">
              <div class="label">PAYMENT METHODS</div>
              <div>${companyData.payment_methods}</div>
            </div>
          ` : ''}

          <!-- Force the contract terms onto a new page with page-break-before -->
          ${invoice.contract_terms ? `
            <div class="contract-terms">
              <div class="label">CONTRACT TERMS</div>
              <div>${invoice.contract_terms}</div>
            </div>
          ` : ''}

          <div class="footer">
            Thank you for your business!
          </div>
        </div>
      </body>
      </html>
    `;

    // Add additional debug logging for payment methods
    console.log('[DEBUG] Payment methods data:', {
      hasCompanyData: !!companyData,
      paymentMethods: companyData?.payment_methods ? 'Present' : 'None provided',
      paymentMethodsLength: companyData?.payment_methods?.length || 0,
      contractTermsLength: invoice.contract_terms?.length || 0
    });

    // Add payment methods to the template if available
    if (companyData?.payment_methods) {
      htmlTemplate = addPaymentMethodsToTemplate(htmlTemplate, companyData.payment_methods);
      console.log('[DEBUG] Payment methods added to template');
    } else {
      console.log('[DEBUG] No payment methods available to add to template');
    }

    // If in debug mode, return a simplified version
    if (debugMode) {
      const debugInfo = {
        invoiceId,
        companyId: invoice.company_id,
        companyName: invoice.company?.name,
        companyLogo: companyData?.logo_url || invoice.company?.logo_url,
        clientInfo,
        hasPaymentMethods: !!companyData?.payment_methods,
        paymentMethodsLength: companyData?.payment_methods?.length || 0
      };
      
      // For debug mode, create a simpler HTML template
      const debugHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Debug Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .debug-info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Invoice Debug View</h1>
          <div class="debug-info">
            <h2>Debug Information</h2>
            <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
          
          <h2>Company Information</h2>
          <div>
            ${companyData?.logo_url ? `<img src="${companyData.logo_url}" alt="Company Logo" style="max-height: 100px;">` : 'No logo available'}
            <p><strong>Name:</strong> ${invoice.company?.name || 'Not available'}</p>
            <p><strong>Email:</strong> ${invoice.company?.email || 'Not available'}</p>
            <p><strong>Phone:</strong> ${invoice.company?.phone || 'Not available'}</p>
            <p><strong>Address:</strong> ${invoice.company?.address || 'Not available'}</p>
          </div>
          
          ${companyData?.payment_methods ? `
            <h2>Payment Methods</h2>
            <div style="white-space: pre-line; border: 1px solid #ddd; padding: 10px; background: #fff;">
              ${companyData.payment_methods}
            </div>
          ` : '<p>No payment methods defined</p>'}
        </body>
        </html>
      `;
      
      htmlTemplate = debugHtml;
    }

    // Launch browser and create PDF with better margins
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '50px',
        right: '40px',
        bottom: '50px',
        left: '40px'
      }
    });
    
    await browser.close();

    // Upload PDF to storage
    const timestamp = new Date().getTime();
    const pdfFileName = `invoices/${invoiceId}/invoice-${invoice.number}-${timestamp}.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('public')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF', details: uploadError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get public URL for the uploaded PDF
    const { data: publicUrlData } = await supabase
      .storage
      .from('public')
      .getPublicUrl(pdfFileName);

    const pdfUrl = publicUrlData.publicUrl;

    // Update invoice with PDF URL
    if (!debugMode) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ pdf_url: pdfUrl })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('Error updating invoice with PDF URL:', updateError);
      }
    }

    // Return the PDF URL
    return new Response(
      JSON.stringify({ 
        pdfUrl, 
        debugInfo: debugMode ? {
          invoiceId,
          companyId: invoice.company_id,
          companyName: invoice.company?.name,
          hasPaymentMethods: !!companyData?.payment_methods,
          paymentMethodsLength: companyData?.payment_methods?.length || 0,
          clientInfo
        } : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
