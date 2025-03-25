
import { renderToStaticMarkup } from 'react-dom/server';
import InvoiceStaticView from '@/components/InvoiceStaticView';
import { supabase, logDebug, logError } from '@/integrations/supabase/client';
import { Invoice, Client, Job } from '@/types';

export const generateInvoiceHtml = async (invoiceId: string): Promise<string> => {
  try {
    logDebug('Generating invoice HTML for invoice:', invoiceId);
    
    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
      
    if (invoiceError || !invoice) {
      logError('Invoice not found', { invoiceId, error: invoiceError });
      throw new Error('Invoice not found');
    }
    
    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);
      
    if (itemsError) {
      logError('Error fetching invoice items', { invoiceId, error: itemsError });
      throw new Error('Failed to fetch invoice items');
    }
    
    // Add items to invoice object
    const invoiceWithItems = {
      ...invoice,
      items: items || []
    } as Invoice;
    
    // Fetch payment schedules if any
    if (invoice.paymentSchedules === undefined) {
      const { data: schedules, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceId);
        
      if (schedulesError) {
        logError('Error fetching payment schedules', { invoiceId, error: schedulesError });
        // Don't throw error, just continue without schedules
      } else {
        invoiceWithItems.paymentSchedules = schedules || [];
      }
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.clientId)
      .single();
      
    if (clientError || !client) {
      logError('Client not found', { clientId: invoice.clientId, error: clientError });
      throw new Error('Client not found');
    }

    // Fetch company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, logo_url, email, phone, address')
      .eq('id', invoice.companyId)
      .single();
      
    if (companyError || !company) {
      logError('Company not found', { companyId: invoice.companyId, error: companyError });
      throw new Error('Company not found');
    }

    // Transform logo_url if it's a relative path
    let logoUrl = company.logo_url;
    if (logoUrl && !logoUrl.startsWith('http')) {
      // Use a real bucket name if available, otherwise this is a placeholder
      const bucketName = 'company-logos'; 
      const baseUrl = `${supabase.supabaseUrl}/storage/v1/object/public`;
      logoUrl = `${baseUrl}/${bucketName}/${logoUrl}`;
      logDebug('Transformed logo URL:', { original: company.logo_url, transformed: logoUrl });
    }

    // Fetch job data if applicable
    let job: Job | null = null;
    if (invoice.jobId) {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', invoice.jobId)
        .single();
        
      if (jobError) {
        logError('Error fetching job', { jobId: invoice.jobId, error: jobError });
        // Don't throw error, just continue without job
      } else {
        job = jobData;
      }
    }

    // Render the invoice component to HTML
    const htmlContent = renderToStaticMarkup(
      <InvoiceStaticView
        invoice={invoiceWithItems}
        client={client}
        company={{ ...company, logo_url: logoUrl }}
        job={job}
      />
    );

    // Wrap in a basic HTML structure
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.number}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0;
            background-color: #f9fafb;
          }
          .invoice-container { 
            max-width: 800px; 
            margin: 20px auto; 
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          @media print {
            body { 
              background-color: white; 
            }
            .invoice-container {
              box-shadow: none;
              margin: 0;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${htmlContent}
        </div>
      </body>
      </html>
    `;

    logDebug('Successfully generated HTML for invoice', { invoiceId });
    return fullHtml;
  } catch (error) {
    logError('Error generating invoice HTML', error);
    throw error;
  }
};

export const storeInvoiceHtml = async (invoiceId: string): Promise<string | null> => {
  try {
    // Generate the HTML
    const html = await generateInvoiceHtml(invoiceId);
    
    // Update the invoice with the generated HTML
    const { error } = await supabase
      .from('invoices')
      .update({ invoice_html: html })
      .eq('id', invoiceId);
      
    if (error) {
      logError('Error storing invoice HTML in database', { invoiceId, error });
      throw error;
    }
    
    logDebug('Successfully stored invoice HTML in database', { invoiceId });
    return html;
  } catch (error) {
    logError('Error in storeInvoiceHtml', error);
    return null;
  }
};
