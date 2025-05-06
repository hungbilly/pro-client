
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsPDF } from 'https://esm.sh/jspdf@3.0.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import autoTable from 'https://esm.sh/jspdf-autotable@3.8.0';

interface Invoice {
  id: string;
  client_id: string;
  company_id: string;
  job_id?: string;
  number: string;
  amount: number;
  date: string;
  due_date: string;
  status: string;
  notes?: string;
  contract_terms?: string;
  view_link?: string;
  shooting_date?: string;
  contract_status?: string;
  pdf_url?: string;
  invoice_items?: InvoiceItem[];
  payment_schedules?: PaymentSchedule[];
}

interface InvoiceItem {
  id: string;
  invoice_id: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
  name?: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  user_id: string;
}

interface Company {
  id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  user_id: string;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  date?: string;
  client_id: string;
  user_id: string;
  makeup?: string;
}

interface PaymentSchedule {
  id: string;
  invoice_id: string;
  due_date: string;
  percentage: number;
  description?: string;
  status: string;
  payment_date?: string | null;
}

interface FormattedInvoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  status: string;
  notes?: string;
  contractTerms?: string;
  contractStatus?: string;
  viewLink?: string;
  shootingDate?: string;
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  company: {
    id: string;
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    logoUrl?: string;
  };
  job?: {
    id: string;
    title: string;
    description?: string;
    date?: string;
    makeup?: string;
  };
  items: {
    id: string;
    name?: string;
    description?: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  paymentSchedules: {
    id: string;
    dueDate: string;
    percentage: number;
    description?: string;
    status: string;
    paymentDate?: string | null;
    amount: number;
  }[];
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Enhanced logging with timestamps
const log = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, data ? data : '');
  },
  error: (message: string, error: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, error);
    
    if (error?.stack) {
      console.error(`[${timestamp}] [ERROR] Stack trace:`, error.stack);
    }
  },
  debug: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEBUG] ${message}`, data ? data : '');
  }
};

// Enhanced headers with CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  // Track execution stages and timing for debugging
  const executionStages: Record<string, { start: number; end?: number; success?: boolean; error?: string }> = {
    'request_start': { start: Date.now() },
  };

  // Collect debug info
  const debugInfo: Record<string, any> = {
    timestamp: new Date().toISOString(),
    stages: executionStages,
  };

  try {
    executionStages.parse_request = { start: Date.now() };
    const { invoiceId, forceRegenerate = false, debugMode = false, clientInfo = {} } = await req.json();
    executionStages.parse_request.end = Date.now();
    
    log.info('Received request to generate PDF for invoice:', {
      invoiceId,
      forceRegenerate,
      debugMode,
      clientInfo
    });
    
    debugInfo.requestParams = {
      invoiceId,
      forceRegenerate,
      debugMode,
      clientInfo
    };

    if (!invoiceId) {
      executionStages.validation = { start: Date.now(), end: Date.now(), success: false, error: 'Missing invoiceId' };
      log.error('Missing required parameter: invoiceId', {});
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: invoiceId',
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 400 }
      );
    }

    // Validation step
    executionStages.validation = { start: Date.now() };
    
    // Fetch existing invoice PDF URL and check if we need to regenerate
    if (!forceRegenerate && !debugMode) {
      executionStages.check_existing = { start: Date.now() };
      const { data: existingInvoice, error: existingError } = await supabase
        .from('invoices')
        .select('pdf_url, number')
        .eq('id', invoiceId)
        .single();

      executionStages.check_existing.end = Date.now();
      executionStages.check_existing.success = !existingError;
      
      if (!existingError && existingInvoice?.pdf_url) {
        log.info('Using existing PDF URL:', existingInvoice.pdf_url);
        
        try {
          // Try to validate the existing PDF URL
          executionStages.validate_existing = { start: Date.now() };
          
          // Fetch headers only to check if file exists and is a PDF
          const pdfResponse = await fetch(existingInvoice.pdf_url, { method: 'HEAD' });
          
          executionStages.validate_existing.end = Date.now();
          
          if (pdfResponse.ok) {
            const contentType = pdfResponse.headers.get('content-type');
            const contentLength = pdfResponse.headers.get('content-length');
            
            log.debug('Existing PDF validation results:', {
              status: pdfResponse.status,
              contentType,
              contentLength
            });
            
            // If content type is PDF and size is reasonable, use the existing URL
            if (contentType?.includes('pdf') && parseInt(contentLength || '0') > 1000) {
              log.info('Existing PDF is valid, returning URL');
              executionStages.validate_existing.success = true;
              
              debugInfo.pdfInfo = {
                source: 'existing',
                url: existingInvoice.pdf_url,
                contentType,
                contentLength
              };
              
              return new Response(
                JSON.stringify({ 
                  pdfUrl: existingInvoice.pdf_url,
                  debugInfo: debugMode ? debugInfo : undefined
                }),
                { headers, status: 200 }
              );
            } else {
              executionStages.validate_existing.success = false;
              executionStages.validate_existing.error = 'Invalid content type or size';
              log.warn('Existing PDF appears invalid, regenerating...', {
                contentType,
                contentLength
              });
            }
          } else {
            executionStages.validate_existing.success = false;
            executionStages.validate_existing.error = `HTTP ${pdfResponse.status}`;
            log.warn('Existing PDF URL returned non-OK status, regenerating...', {
              status: pdfResponse.status,
              statusText: pdfResponse.statusText
            });
          }
        } catch (e) {
          executionStages.validate_existing.success = false;
          executionStages.validate_existing.error = e instanceof Error ? e.message : 'Unknown error';
          log.error('Error verifying existing PDF:', e);
          // Continue with regeneration
        }
      }
    }

    executionStages.validation.end = Date.now();
    executionStages.validation.success = true;

    // Fetch all invoice data
    executionStages.fetch_data = { start: Date.now() };
    
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), payment_schedules(*)')
      .eq('id', invoiceId)
      .single();
      
    if (invoiceError || !invoice) {
      executionStages.fetch_data.end = Date.now();
      executionStages.fetch_data.success = false;
      executionStages.fetch_data.error = invoiceError ? invoiceError.message : 'Invoice not found';
      
      log.error('Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch invoice data', 
          details: invoiceError?.message,
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 500 }
      );
    }

    log.info('Fetched invoice data successfully. Invoice number:', invoice.number);
    debugInfo.invoiceNumber = invoice.number;

    // Fetch related data (client, company, job)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    if (clientError) {
      log.warn('Warning: Client not found for ID:', invoice.client_id);
      debugInfo.warnings = [...(debugInfo.warnings || []), 'Client not found'];
    }

    const { data: company, error: companyError } = await supabase
      .from('company_clientview')
      .select('*')
      .eq('company_id', invoice.company_id)
      .single();
    
    log.debug('Invoice company_id:', invoice.company_id);
    log.debug('Fetched company data from company_clientview:', company);
    
    if (companyError) {
      log.error('Error fetching company data from company_clientview:', companyError);
      debugInfo.warnings = [...(debugInfo.warnings || []), 'Company not found'];
    }

    let job = null;
    if (invoice.job_id) {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', invoice.job_id)
        .single();
      
      if (jobError) {
        log.warn('Warning: Job not found for ID:', invoice.job_id, jobError);
        debugInfo.warnings = [...(debugInfo.warnings || []), 'Job not found'];
      } else {
        job = jobData;
      }
    }
    
    executionStages.fetch_data.end = Date.now();
    executionStages.fetch_data.success = true;

    // Format the data for PDF generation
    executionStages.format_data = { start: Date.now() };
    
    const formattedInvoice: FormattedInvoice = {
      id: invoice.id,
      number: invoice.number,
      date: invoice.date,
      dueDate: invoice.due_date,
      amount: invoice.amount,
      status: invoice.status,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      contractStatus: invoice.contract_status,
      viewLink: invoice.view_link,
      shootingDate: invoice.shooting_date,
      client: client || { id: 'unknown', name: 'Unknown Client' },
      company: company ? {
        id: company.id,
        name: company.name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        website: company.website,
        logoUrl: company.logo_url
      } : { id: 'unknown', name: 'Unknown Company' },
      job: job ? {
        id: job.id,
        title: job.title,
        description: job.description,
        date: job.date,
        makeup: job.makeup,
      } : undefined,
      items: (invoice.invoice_items || []).map((item: InvoiceItem) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })),
      paymentSchedules: (invoice.payment_schedules || []).map((schedule: PaymentSchedule) => ({
        id: schedule.id,
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        description: schedule.description,
        status: schedule.status,
        paymentDate: schedule.payment_date,
        amount: (invoice.amount * schedule.percentage) / 100,
      })),
    };
    
    executionStages.format_data.end = Date.now();
    executionStages.format_data.success = true;
    
    debugInfo.companyInfo = {
      hasLogo: !!company?.logo_url,
      logoUrl: company?.logo_url,
    };

    log.info('Generating PDF for invoice:', invoiceId);
    
    // Generate the PDF
    executionStages.generate_pdf = { start: Date.now() };
    
    let pdfData;
    try {
      pdfData = await generatePDF(formattedInvoice);
      executionStages.generate_pdf.end = Date.now();
      executionStages.generate_pdf.success = true;
    } catch (pdfError) {
      executionStages.generate_pdf.end = Date.now();
      executionStages.generate_pdf.success = false;
      executionStages.generate_pdf.error = pdfError instanceof Error ? pdfError.message : 'Unknown error';
      
      log.error('Error generating PDF:', pdfError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 500 }
      );
    }

    // Enhanced validation of generated PDF
    executionStages.validate_pdf = { start: Date.now() };
    
    if (!pdfData) {
      executionStages.validate_pdf.end = Date.now();
      executionStages.validate_pdf.success = false;
      executionStages.validate_pdf.error = 'No PDF data generated';
      
      log.error('PDF generation returned null or undefined data');
      return new Response(
        JSON.stringify({ 
          error: 'PDF generation failed - no data returned',
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 500 }
      );
    }

    // Handle very small PDF sizes which likely indicate an error
    if (pdfData.byteLength < 1000) {
      executionStages.validate_pdf.end = Date.now();
      executionStages.validate_pdf.success = false;
      executionStages.validate_pdf.error = `PDF too small: ${pdfData.byteLength} bytes`;
      
      log.error('Generated PDF is suspiciously small:', pdfData.byteLength, 'bytes. This may indicate a failed generation.');
      return new Response(
        JSON.stringify({ 
          error: `Generated PDF appears invalid. PDF size too small: ${pdfData.byteLength} bytes`,
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 500 }
      );
    }
    
    // Check if PDF starts with %PDF- magic bytes (PDF signature)
    const pdfSignature = new TextDecoder().decode(pdfData.slice(0, 5));
    if (pdfSignature !== '%PDF-') {
      executionStages.validate_pdf.end = Date.now();
      executionStages.validate_pdf.success = false;
      executionStages.validate_pdf.error = `Invalid PDF signature: ${pdfSignature}`;
      
      log.error('Generated data is not a valid PDF - invalid signature:', pdfSignature);
      return new Response(
        JSON.stringify({ 
          error: `Generated data is not a valid PDF file`,
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 500 }
      );
    }
    
    // Check if PDF size is too large (over 5MB)
    if (pdfData.byteLength > 5000000) {
      executionStages.validate_pdf.end = Date.now();
      executionStages.validate_pdf.success = false;
      executionStages.validate_pdf.error = `PDF too large: ${pdfData.byteLength} bytes`;
      
      log.error('Generated PDF is suspiciously large:', pdfData.byteLength, 'bytes. This may indicate data corruption.');
      return new Response(
        JSON.stringify({ 
          error: `Generated PDF appears invalid. PDF size too large: ${(pdfData.byteLength / 1024 / 1024).toFixed(2)} MB`,
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 500 }
      );
    }
    
    executionStages.validate_pdf.end = Date.now();
    executionStages.validate_pdf.success = true;

    log.info(`PDF generated successfully, size: ${pdfData.byteLength} bytes`);
    debugInfo.pdfSize = pdfData.byteLength;

    // Upload PDF to storage
    const timestamp = Date.now();
    const filePath = `invoices/${invoiceId}.pdf`;
    log.info('Uploading PDF to storage path:', filePath);
    
    executionStages.upload_pdf = { start: Date.now() };

    // FIXED: This is the critical part that was causing the issue
    // We need to make sure we're only uploading the PDF data with the correct content type
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('invoice-pdfs')
      .upload(filePath, pdfData, {
        contentType: 'application/pdf', // Explicitly set contentType
        upsert: true,
      });

    if (uploadError) {
      executionStages.upload_pdf.end = Date.now();
      executionStages.upload_pdf.success = false;
      executionStages.upload_pdf.error = uploadError.message;
      
      log.error('Error uploading PDF to storage:', uploadError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to upload PDF: ${uploadError.message}`,
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 500 }
      );
    }
    
    executionStages.upload_pdf.end = Date.now();
    executionStages.upload_pdf.success = true;

    log.info('PDF uploaded successfully to storage');

    // Get public URL
    executionStages.get_url = { start: Date.now() };
    
    const { data: publicUrlData } = supabase
      .storage
      .from('invoice-pdfs')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      executionStages.get_url.end = Date.now();
      executionStages.get_url.success = false;
      executionStages.get_url.error = 'No public URL generated';
      
      log.error('Failed to get public URL for PDF');
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get public URL for PDF',
          debugInfo: debugMode ? debugInfo : undefined
        }),
        { headers, status: 500 }
      );
    }
    
    executionStages.get_url.end = Date.now();
    executionStages.get_url.success = true;

    // Add a timestamp to the URL to prevent caching issues
    const pdfUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;
    log.info('Generated public URL for PDF:', pdfUrl);
    debugInfo.pdfUrl = pdfUrl;

    // Before updating the invoice with PDF URL, verify the uploaded file
    executionStages.verify_upload = { start: Date.now() };

    try {
      // Verify the uploaded PDF is actually a PDF by checking headers and a sample of the content
      const verifyResponse = await fetch(pdfUrl, { 
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache, no-store'
        }
      });

      const contentType = verifyResponse.headers.get('content-type');
      const contentLength = verifyResponse.headers.get('content-length');
      
      log.debug('Verification of uploaded PDF:', {
        url: pdfUrl,
        status: verifyResponse.status,
        contentType,
        contentLength
      });

      // If verification failed, log warning but continue (will be reported in debugInfo)
      if (!verifyResponse.ok || !contentType?.includes('pdf')) {
        log.warn('Uploaded PDF verification failed:', {
          status: verifyResponse.status,
          contentType
        });
        
        debugInfo.verificationWarning = {
          message: 'Uploaded PDF verification failed',
          status: verifyResponse.status,
          contentType
        };
      } else {
        log.info('Uploaded PDF verified successfully');
        
        // Additional check: compare file size with what we generated
        const uploadedSize = parseInt(contentLength || '0');
        const sizeDifference = Math.abs(uploadedSize - pdfData.byteLength);
        const percentDifference = (sizeDifference / pdfData.byteLength) * 100;
        
        if (percentDifference > 5) { // Allow 5% difference
          log.warn('Uploaded PDF size differs significantly from generated PDF:', {
            generated: pdfData.byteLength,
            uploaded: uploadedSize,
            difference: `${percentDifference.toFixed(2)}%`
          });
          
          debugInfo.verificationWarning = {
            message: 'File size discrepancy',
            generated: pdfData.byteLength,
            uploaded: uploadedSize,
            difference: `${percentDifference.toFixed(2)}%`
          };
        }
      }
    } catch (e) {
      log.error('Error verifying uploaded PDF:', e);
      debugInfo.verificationError = e instanceof Error ? e.message : 'Unknown error verifying upload';
    }
    
    executionStages.verify_upload.end = Date.now();
    executionStages.verify_upload.success = true;

    // Update the invoice with the PDF URL
    executionStages.update_invoice = { start: Date.now() };
    
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoiceId);

    if (updateError) {
      executionStages.update_invoice.end = Date.now();
      executionStages.update_invoice.success = false;
      executionStages.update_invoice.error = updateError.message;
      
      log.error('Error updating invoice with PDF URL:', updateError);
      debugInfo.warnings = [...(debugInfo.warnings || []), 'Failed to update invoice record with PDF URL'];
      // Continue anyway since we have the PDF URL
    } else {
      executionStages.update_invoice.end = Date.now();
      executionStages.update_invoice.success = true;
      log.info('Invoice updated with PDF URL');
    }

    // Check if the file exists and has proper size in storage
    executionStages.verify_storage = { start: Date.now() };
    
    try {
      const { data: fileInfo, error: listError } = await supabase
        .storage
        .from('invoice-pdfs')
        .list('invoices', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
          search: invoiceId
        });

      if (listError) {
        executionStages.verify_storage.end = Date.now();
        executionStages.verify_storage.success = false;
        executionStages.verify_storage.error = listError.message;
        log.error('Error listing storage files:', listError);
      } else {
        executionStages.verify_storage.end = Date.now();
        executionStages.verify_storage.success = true;
        
        // Add new detailed logging about file storage information
        if (fileInfo && fileInfo.length > 0) {
          const fileDetails = fileInfo[0];
          log.debug('PDF file storage details:', {
            name: fileDetails.name,
            size: fileDetails.metadata?.size,
            contentType: fileDetails.metadata?.mimetype,
            created: fileDetails.created_at
          });
          
          // Additional validation of the stored file
          if (fileDetails.metadata?.mimetype !== 'application/pdf') {
            log.error('Stored file has incorrect MIME type:', fileDetails.metadata?.mimetype);
            debugInfo.storageWarnings = [...(debugInfo.storageWarnings || []), 
              `File has incorrect MIME type: ${fileDetails.metadata?.mimetype}`];
          }
          
          // Check file size
          const storedSize = fileDetails.metadata?.size;
          if (storedSize && (storedSize > pdfData.byteLength * 1.1 || storedSize < pdfData.byteLength * 0.9)) {
            log.error('Stored file size differs significantly from generated PDF:', {
              generatedSize: pdfData.byteLength,
              storedSize: storedSize
            });
            debugInfo.storageWarnings = [...(debugInfo.storageWarnings || []), 
              `File size mismatch: generated=${pdfData.byteLength}, stored=${storedSize}`];
          }
          
          debugInfo.storageInfo = {
            fileName: fileDetails.name,
            fileSize: fileDetails.metadata?.size,
            contentType: fileDetails.metadata?.mimetype,
            created: fileDetails.created_at
          };
        } else {
          log.warn('No files found in storage after upload');
          debugInfo.storageWarnings = [...(debugInfo.storageWarnings || []), 'File not found after upload'];
        }
      }
    } catch (e) {
      executionStages.verify_storage.end = Date.now();
      executionStages.verify_storage.success = false;
      executionStages.verify_storage.error = e instanceof Error ? e.message : 'Unknown error';
      log.error('Error checking storage file:', e);
    }
    
    // Add request completion info
    executionStages.request_complete = { start: Date.now(), end: Date.now(), success: true };
    debugInfo.executionTime = executionStages.request_complete.start - executionStages.request_start.start;
    
    // Perform a final verification step to ensure the PDF is accessible
    executionStages.final_verification = { start: Date.now() };
    
    try {
      const verifyResponse = await fetch(pdfUrl, { method: 'HEAD' });
      const contentType = verifyResponse.headers.get('content-type');
      const contentLength = verifyResponse.headers.get('content-length');
      
      debugInfo.finalVerification = {
        status: verifyResponse.status,
        contentType,
        contentLength,
        ok: verifyResponse.ok
      };
      
      executionStages.final_verification.end = Date.now();
      executionStages.final_verification.success = verifyResponse.ok && contentType?.includes('pdf');
      
      if (!verifyResponse.ok || !contentType?.includes('pdf')) {
        log.warn('Final PDF verification failed:', {
          status: verifyResponse.status,
          contentType,
          contentLength
        });
      }
    } catch (e) {
      executionStages.final_verification.end = Date.now();
      executionStages.final_verification.success = false;
      executionStages.final_verification.error = e instanceof Error ? e.message : 'Unknown error';
      log.error('Error in final verification:', e);
    }

    // Return the PDF URL to the client
    return new Response(
      JSON.stringify({ 
        pdfUrl,
        debugInfo: debugMode ? debugInfo : undefined
      }),
      { headers, status: 200 }
    );
  } catch (error) {
    log.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        debugInfo: debugInfo
      }),
      { headers, status: 500 }
    );
  }
});

function stripHtml(html: string): string {
  if (!html) return '';
  
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n');
  
  text = text.replace(/<[^>]*>/g, '');
  
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

function addWrappedText(doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 7, pageHeight: number, margin: number): number {
  if (!text) return y;
  
  const cleanText = stripHtml(text);
  const lines = doc.splitTextToSize(cleanText, maxWidth);
  
  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      console.log('Added new page in addWrappedText, new y position:', y);
    }
    doc.text(lines[i], x, y);
    y += lineHeight;
  }
  
  return y;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function generatePDF(invoiceData: FormattedInvoice): Promise<Uint8Array> {
  console.log('Generating PDF for invoice:', invoiceData.number);
  console.log('Invoice data overview:', {
    hasClient: !!invoiceData.client,
    hasCompany: !!invoiceData.company,
    hasJob: !!invoiceData.job,
    hasItems: !!invoiceData.items && invoiceData.items.length > 0,
    hasPaymentSchedules: !!invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0,
    hasNotes: !!invoiceData.notes,
    hasContractTerms: !!invoiceData.contractTerms,
    contractTermsLength: invoiceData.contractTerms?.length || 0,
    contractTermsPreview: invoiceData.contractTerms?.substring(0, 100),
    companyLogoUrl: invoiceData.company.logoUrl,
  });
  
  try {
    // Create a new PDF document with jsPDF v3.x syntax
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Add Inter font (similar to the web app font)
    doc.setFont('helvetica');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    const columnWidth = (pageWidth - (margin * 3)) / 2;
    
    let y = margin;

    // Add page footer helper function
    const addPageFooter = () => {
      const totalPages = doc.getNumberOfPages();
      console.log('Adding footer to', totalPages, 'pages');
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const generatedText = `Generated on ${new Date().toLocaleDateString()}`;
        const statusText = `${invoiceData.status === 'accepted' ? 'Invoice accepted' : 'Invoice not accepted'} | ${invoiceData.contractStatus === 'accepted' ? 'Contract terms accepted' : 'Contract terms not accepted'}`;
        console.log(`Footer for page ${i}:`, { generatedText, statusText });
        doc.text(generatedText, margin, pageHeight - 10);
        doc.text(statusText, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
    };

    // ===== Updated Header Layout =====
    // Left side - Logo
    const rightColumnX = pageWidth * 0.55; // Move the right column start point
    let rightColumnY = y;
    let leftColumnY = y;

    // Logo positioning
    if (invoiceData.company.logoUrl) {
      console.log('Attempting to add logo from URL:', invoiceData.company.logoUrl);
      try {
        const response = await fetch(invoiceData.company.logoUrl);
        if (!response.ok) {
          console.error(`Failed to fetch logo: Status ${response.status} ${response.statusText}`);
          throw new Error(`Failed to fetch logo: ${response.statusText}`);
        }
      
        const blob = await response.blob();
        console.log('Logo blob fetched successfully, size:', blob.size, 'bytes, type:', blob.type);
        
        const logo = await blobToBase64(blob);
        console.log('Logo converted to base64 successfully, length:', logo.length);
      
        const maxLogoHeight = 40;
        // Updated to match jsPDF v3.x API
        try {
          const imgProps = doc.getImageProperties(logo);
          console.log('Logo image properties:', imgProps);
        
          const aspectRatio = imgProps.width / imgProps.height;
          const logoHeight = Math.min(maxLogoHeight, imgProps.height);
          const logoWidth = logoHeight * aspectRatio;
        
          // Adjust logo X position to move more to the left
          const logoX = margin + (rightColumnX - margin - logoWidth) / 4;
      
          doc.addImage(logo, 'PNG', logoX, y, logoWidth, logoHeight);
          console.log('Logo added to PDF successfully');
          leftColumnY += logoHeight + 10; // Update left column position after logo
        } catch (logoImgError) {
          console.error('Error adding logo image to PDF:', logoImgError);
          throw logoImgError;
        }
      } catch (logoError) {
        console.error('Error adding logo:', logoError);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(invoiceData.company.name.toUpperCase(), margin, leftColumnY + 15);
        leftColumnY += 20;
      }
    } else {
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(invoiceData.company.name.toUpperCase(), margin, leftColumnY + 15);
      leftColumnY += 20;
    }

    // Company details now below the logo on the left
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('FROM', margin, leftColumnY);
    leftColumnY += 7;

    // Company details
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(invoiceData.company.name, margin, leftColumnY);
    leftColumnY += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (invoiceData.company.email) {
      doc.text(invoiceData.company.email, margin, leftColumnY);
      leftColumnY += 6;
    }
    
    if (invoiceData.company.phone) {
      doc.text(invoiceData.company.phone, margin, leftColumnY);
      leftColumnY += 6;
    }
    
    if (invoiceData.company.address) {
      const addressLines = invoiceData.company.address.split('\n');
      const flattenedAddress = addressLines.join(' ');
      doc.text(flattenedAddress, margin, leftColumnY);
      leftColumnY += 10;
    }

    // Right side - Client Information
    // "INVOICE FOR" section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('INVOICE FOR', rightColumnX, rightColumnY);
    rightColumnY += 7;

    // Job title if available
    if (invoiceData.job && invoiceData.job.title) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(invoiceData.job.title, rightColumnX, rightColumnY);
      rightColumnY += 7;
    }

    // Client information
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${invoiceData.client.name}`, rightColumnX, rightColumnY);
    rightColumnY += 6;
    
    if (invoiceData.client.email) {
      doc.text(invoiceData.client.email, rightColumnX, rightColumnY);
      rightColumnY += 6;
    }
    
    if (invoiceData.client.phone) {
      doc.text(invoiceData.client.phone, rightColumnX, rightColumnY);
      rightColumnY += 6;
    }

    // Job date if available
    if (invoiceData.job && invoiceData.job.date) {
      rightColumnY += 4;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('JOB DATE', rightColumnX, rightColumnY);
      rightColumnY += 7;
    
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(invoiceData.job.date, rightColumnX, rightColumnY);
    }

    // Move y position to the max of the header sections
    y = Math.max(leftColumnY + 10, rightColumnY + 10);
  
    // Add separator line
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    // Continue with rest of the PDF (invoice details, items, payment schedule, etc.)
    // ===== End of Updated Header Layout =====

    // Invoice Number and Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`INVOICE #${invoiceData.number}`, margin, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const invoiceDetailsTable = [
      ['Invoice Date:', new Date(invoiceData.date).toLocaleDateString()],
      ['Due Date:', new Date(invoiceData.dueDate).toLocaleDateString()],
      ['Status:', invoiceData.status.toUpperCase()]
    ];
    
    autoTable(doc, {
      startY: y,
      head: [],
      body: invoiceDetailsTable,
      theme: 'plain',
      styles: {
        cellPadding: 1,
        fontSize: 10,
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
    
    if (invoiceData.items && invoiceData.items.length > 0) {
      console.log('Rendering INVOICE ITEMS section');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE ITEMS', margin, y);
      
      y += 5;
      
      const tableHeaders = [
        { header: 'Package/Service', dataKey: 'name' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Qty', dataKey: 'quantity' },
        { header: 'Rate', dataKey: 'rate' },
        { header: 'Amount', dataKey: 'amount' }
      ];
      
      const tableData = invoiceData.items.map(item => {
        const row = {
          name: item.name || 'Product/Service',
          description: stripHtml(item.description || ''),
          quantity: item.quantity.toString(),
          rate: `$${item.rate.toFixed(2)}`,
          amount: `$${item.amount.toFixed(2)}`
        };
        console.log('Invoice item row:', row);
        return row;
      });
      
      autoTable(doc, {
        head: [tableHeaders.map(h => h.header)],
        body: tableData.map(row => 
          tableHeaders.map(h => row[h.dataKey as keyof typeof row])
        ),
        startY: y,
        margin: { left: margin, right: margin },
        headStyles: { 
          fillColor: [240, 240, 240], 
          textColor: [50, 50, 50],
          fontStyle: 'bold',
          font: 'helvetica'
        },
        bodyStyles: { 
          fontSize: 9,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          font: 'helvetica'
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' }
        },
        theme: 'grid',
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
          font: 'helvetica'
        },
        didDrawPage: (data: any) => {
          y = data.cursor.y + 5;
          console.log('Invoice items table drawn, new y position:', y);
        }
      });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      console.log('Total amount:', invoiceData.amount);
      doc.text('TOTAL:', pageWidth - margin - 35, y);
      doc.text(`$${invoiceData.amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      
      y += 15;
    } else {
      console.log('No invoice items to render');
    }
    
    if (invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0) {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin;
        console.log('Added new page for payment schedule, new y position:', y);
      }
      
      console.log('Rendering PAYMENT SCHEDULE section');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT SCHEDULE', margin, y);
      
      y += 8;
      
      doc.setFontSize(9);
      
      const paymentHeaders = [
        { header: 'Description', dataKey: 'description' },
        { header: 'Due Date', dataKey: 'dueDate' },
        { header: 'Percentage', dataKey: 'percentage' },
        { header: 'Amount', dataKey: 'amount' },
        { header: 'Status', dataKey: 'status' }
      ];
      
      const paymentData = invoiceData.paymentSchedules.map(schedule => {
        const row = {
          description: schedule.description || '',
          dueDate: new Date(schedule.dueDate).toLocaleDateString(),
          percentage: schedule.percentage ? `${schedule.percentage}%` : 'N/A',
          amount: `$${schedule.amount.toFixed(2)}`,
          status: schedule.status.toUpperCase()
        };
        console.log('Payment schedule row:', row);
        return row;
      });
      
      autoTable(doc, {
        head: [paymentHeaders.map(h => h.header)],
        body: paymentData.map(row => 
          paymentHeaders.map(h => row[h.dataKey as keyof typeof row])
        ),
        startY: y,
        margin: { left: margin, right: margin },
        headStyles: { 
          fillColor: [240, 240, 240], 
          textColor: [50, 50, 50],
          fontStyle: 'bold',
          font: 'helvetica'
        },
        bodyStyles: { 
          fontSize: 9,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          font: 'helvetica'
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 30 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'center' }
        },
        theme: 'grid',
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
          font: 'helvetica'
        },
        didDrawPage: (data: any) => {
          y = data.cursor.y + 10;
          console.log('Payment schedule table drawn, new y position:', y);
        }
      });
    } else {
      console.log('No payment schedules to render');
    }
    
    if (invoiceData.notes) {
      if (y > pageHeight - 70) {
        doc.addPage();
        y = margin;
        console.log('Added new page for notes, new y position:', y);
      }
      
      console.log('Rendering NOTES section');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES', margin, y);
      
      y += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      console.log('Notes content:', invoiceData.notes);
      
      const notesY = addWrappedText(doc, invoiceData.notes, margin, y, contentWidth, 5, pageHeight, margin);
      y = notesY + 15;
      console.log('Notes section drawn, new y position:', y);
    } else {
      console.log('No notes to render');
    }
    
    if (invoiceData.contractTerms) {
      console.log('Rendering CONTRACT TERMS section');
      
      doc.addPage();
      y = margin;
      console.log('Added new page for contract terms, new y position:', y);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRACT TERMS', margin, y);
      
      y += 10;
      
      const paragraphs = invoiceData.contractTerms.split('\n\n');
      doc.setFontSize(9);
      console.log('Contract terms paragraphs:', paragraphs);
      
      paragraphs.forEach((paragraph, index) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
          console.log(`Added new page for contract terms paragraph ${index + 1}, new y position:`, y);
        }
        
        const trimmedParagraph = paragraph.trim();
        const isHeading = trimmedParagraph.length < 50 && trimmedParagraph.toUpperCase() === trimmedParagraph;
        console.log(`Paragraph ${index + 1}:`, {
          text: trimmedParagraph.substring(0, 50),
          isHeading,
          yPosition: y,
        });
        
        if (isHeading) {
          doc.setFont('helvetica', 'bold');
          addWrappedText(doc, trimmedParagraph, margin, y, contentWidth, 5, pageHeight, margin);
          y += 7;
        } else {
          doc.setFont('helvetica', 'normal');
          const paragraphY = addWrappedText(doc, trimmedParagraph, margin, y, contentWidth, 5, pageHeight, margin);
          y = paragraphY + 5;
        }
      });
    }
    
    // Add footers to all pages
    addPageFooter();
    
    console.log('PDF generation completed');
    
    // Updated to match jsPDF v3.x API
    const pdfArrayBuffer = doc.output('arraybuffer');
    console.log('PDF array buffer generated, size:', pdfArrayBuffer.byteLength, 'bytes');
    
    // Check PDF signature
    const pdfView = new Uint8Array(pdfArrayBuffer);
    const pdfSignature = new TextDecoder().decode(pdfView.slice(0, 5));
    if (pdfSignature !== '%PDF-') {
      console.error('Generated PDF has invalid signature:', pdfSignature);
      throw new Error('Invalid PDF generated - missing PDF signature');
    }
    
    return pdfView;
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw new Error('Failed to generate PDF: ' + (err as Error).message);
  }
}
