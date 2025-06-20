
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsPDF } from 'https://esm.sh/jspdf@3.0.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import autoTable from 'https://esm.sh/jspdf-autotable@3.8.0';

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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Helper to load a single font weight and register it with jsPDF
async function loadAndRegisterFont(doc: any, fontName: string, weight: string, url: string): Promise<boolean> {
  try {
    log.info(`Attempting to load font: ${fontName} ${weight} from:`, url);
    const fontResponse = await fetch(url, {
      headers: {
        'Accept': 'application/octet-stream'
      }
    });
    if (!fontResponse.ok) {
      throw new Error(`Failed to fetch font: ${fontResponse.status} ${url}`);
    }
    const fontArrayBuffer = await fontResponse.arrayBuffer();
    const fontBytes = new Uint8Array(fontArrayBuffer);
    const base64String = btoa(String.fromCharCode.apply(null, Array.from(fontBytes)));
    const vfsFilename = `${fontName}-${weight}.ttf`;
    doc.addFileToVFS(vfsFilename, base64String);
    doc.addFont(vfsFilename, fontName, weight);
    log.info(`Font loaded and registered successfully: ${fontName} ${weight}`);
    return true;
  } catch (error) {
    log.error(`Error loading font: ${fontName} ${weight}`, error);
    return false;
  }
}

// Loads Chinese fonts (normal and bold) and sets the default font
async function loadChineseFont(doc: any): Promise<boolean> {
  const fontBaseUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/';
  const fontName = 'NotoSansSC';
  const regularFontUrl = `${fontBaseUrl}NotoSansSC-Regular.ttf`;
  const boldFontUrl = `${fontBaseUrl}NotoSansSC-Bold.ttf`;
  
  const [regularLoaded, boldLoaded] = await Promise.all([
    loadAndRegisterFont(doc, fontName, 'normal', regularFontUrl),
    loadAndRegisterFont(doc, fontName, 'bold', boldFontUrl)
  ]);

  if (regularLoaded) {
    doc.setFont(fontName, 'normal');
    log.info('Default font set to NotoSansSC normal.');
  } else {
    doc.setFont('helvetica', 'normal');
    log.warn('Failed to load NotoSansSC normal, falling back to helvetica.');
  }
  
  if (!boldLoaded) {
    log.warn('Failed to load NotoSansSC bold. Bold text may not render correctly with Chinese characters.');
  }

  // Return true if at least the regular font was loaded
  return regularLoaded;
}

// Simple PDF generation function
async function generatePDF(invoiceData: any): Promise<Uint8Array> {
  log.info('Generating PDF for invoice:', invoiceData.number);
  
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Load Chinese font
    const fontLoaded = await loadChineseFont(doc);
    if (!fontLoaded) {
      log.warn('Chinese font not loaded, using Helvetica fallback.');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // Header
    doc.setFontSize(24);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
    doc.text(invoiceData.company.name || 'Company Name', margin, y);
    y += 15;

    // Invoice details
    doc.setFontSize(14);
    doc.text(`Invoice #${invoiceData.number}`, margin, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(invoiceData.date).toLocaleDateString()}`, margin, y);
    y += 6;
    doc.text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, margin, y);
    y += 10;

    // Client info
    doc.setFontSize(12);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
    doc.text('Bill To:', margin, y);
    y += 6;
    
    doc.setFontSize(10);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
    doc.text(invoiceData.client.name || 'Unknown Client', margin, y);
    y += 20;

    // Invoice items table
    if (invoiceData.items && invoiceData.items.length > 0) {
      const tableData = invoiceData.items.map((item: any) => [
        item.name || 'Item',
        item.quantity.toString(),
        `$${item.rate.toFixed(2)}`,
        `$${item.amount.toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: tableData,
        startY: y,
        margin: { left: margin, right: margin },
        headStyles: { 
          fillColor: [240, 240, 240], 
          textColor: [50, 50, 50],
          fontStyle: 'bold',
          font: fontLoaded ? 'NotoSansSC' : 'helvetica'
        },
        bodyStyles: { 
          fontSize: 9,
          font: fontLoaded ? 'NotoSansSC' : 'helvetica'
        },
        styles: {
          font: fontLoaded ? 'NotoSansSC' : 'helvetica'
        }
      });
      
      y = (doc as any).lastAutoTable.finalY + 10;
      
      // Total
      doc.setFontSize(12);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.text('Total:', pageWidth - margin - 35, y);
      doc.text(`$${invoiceData.amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      y += 15;
    }

    // Payment methods
    if (invoiceData.company.payment_methods) {
      doc.setFontSize(12);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.text('Payment Methods:', margin, y);
      y += 8;
      
      doc.setFontSize(9);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
      const paymentLines = invoiceData.company.payment_methods.split('\n');
      paymentLines.forEach((line: string) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 5;
      });
      y += 10;
    }

    // Contract terms
    if (invoiceData.contractTerms) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.text('Contract Terms:', margin, y);
      y += 8;
      
      doc.setFontSize(8);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
      
      // Simple text processing - remove HTML tags and split into lines
      const cleanText = invoiceData.contractTerms
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
      
      const lines = doc.splitTextToSize(cleanText, pageWidth - margin * 2);
      
      lines.forEach((line: string) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 4;
      });
    }

    log.info('PDF generation completed');
    
    // Generate PDF array buffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    return new Uint8Array(pdfArrayBuffer);
  } catch (err) {
    log.error('Error generating PDF:', err);
    throw new Error('Failed to generate PDF: ' + (err as Error).message);
  }
}

serve(async (req) => {
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers,
      status: 204
    });
  }

  // Track execution stages and timing for debugging
  const executionStages: Record<string, any> = {
    'request_start': {
      start: Date.now()
    }
  };

  // Collect debug info
  const debugInfo: Record<string, any> = {
    timestamp: new Date().toISOString(),
    stages: executionStages
  };

  try {
    executionStages.parse_request = {
      start: Date.now()
    };
    const { invoiceId, forceRegenerate = false, debugMode = false, skipSizeValidation = false, allowLargeFiles = false, clientInfo = {} } = await req.json();
    executionStages.parse_request.end = Date.now();
    
    log.info('Received request to generate PDF for invoice:', {
      invoiceId,
      forceRegenerate,
      debugMode,
      skipSizeValidation,
      allowLargeFiles,
      clientInfo
    });
    
    debugInfo.requestParams = {
      invoiceId,
      forceRegenerate,
      debugMode,
      skipSizeValidation,
      allowLargeFiles,
      clientInfo
    };

    if (!invoiceId) {
      log.error('Missing required parameter: invoiceId');
      return new Response(JSON.stringify({
        error: 'Missing required parameter: invoiceId',
        debugInfo: debugMode ? debugInfo : undefined
      }), {
        headers,
        status: 400
      });
    }

    // Fetch all invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), payment_schedules(*)')
      .eq('id', invoiceId)
      .single();
      
    if (invoiceError || !invoice) {
      log.error('Error fetching invoice data:', invoiceError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch invoice data',
        details: invoiceError?.message,
        debugInfo: debugMode ? debugInfo : undefined
      }), {
        headers,
        status: 500
      });
    }

    log.info('Fetched invoice data successfully. Invoice number:', invoice.number);

    // Fetch related data (client, company, job)
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    const { data: company } = await supabase
      .from('company_clientview')
      .select('*')
      .eq('company_id', invoice.company_id)
      .single();

    let job = null;
    if (invoice.job_id) {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', invoice.job_id)
        .single();
      job = jobData;
    }

    // Format the data for PDF generation
    const formattedInvoice = {
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
      client: client || {
        id: 'unknown',
        name: 'Unknown Client'
      },
      company: company ? {
        id: company.id,
        name: company.name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        website: company.website,
        logoUrl: company.logo_url,
        payment_methods: company.payment_methods
      } : {
        id: 'unknown',
        name: 'Unknown Company'
      },
      job: job ? {
        id: job.id,
        title: job.title,
        description: job.description,
        date: job.date
      } : undefined,
      items: (invoice.invoice_items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      })),
      paymentSchedules: (invoice.payment_schedules || []).map((schedule: any) => ({
        id: schedule.id,
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        description: schedule.description,
        status: schedule.status,
        paymentDate: schedule.payment_date,
        amount: (invoice.amount * schedule.percentage) / 100
      }))
    };

    log.info('Generating PDF for invoice:', invoiceId);
    
    // Generate the PDF
    let pdfData: Uint8Array;
    try {
      pdfData = await generatePDF(formattedInvoice);
    } catch (pdfError) {
      log.error('Error generating PDF:', pdfError);
      return new Response(JSON.stringify({
        error: `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
        debugInfo: debugMode ? debugInfo : undefined
      }), {
        headers,
        status: 500
      });
    }

    // Validate generated PDF
    if (!pdfData || !(pdfData instanceof Uint8Array)) {
      log.error('PDF generation returned invalid data');
      return new Response(JSON.stringify({
        error: 'PDF generation failed - invalid data returned',
        debugInfo: debugMode ? debugInfo : undefined
      }), {
        headers,
        status: 500
      });
    }

    if (pdfData.byteLength < 1000) {
      log.error('Generated PDF is suspiciously small:', pdfData.byteLength, 'bytes');
      return new Response(JSON.stringify({
        error: `Generated PDF appears invalid. PDF size too small: ${pdfData.byteLength} bytes`,
        debugInfo: debugMode ? debugInfo : undefined
      }), {
        headers,
        status: 500
      });
    }

    // Check PDF signature
    const pdfSignature = new TextDecoder().decode(pdfData.slice(0, 5));
    if (pdfSignature !== '%PDF-') {
      log.error('Generated data is not a valid PDF - invalid signature:', pdfSignature);
      return new Response(JSON.stringify({
        error: 'Generated data is not a valid PDF file',
        debugInfo: debugMode ? debugInfo : undefined
      }), {
        headers,
        status: 500
      });
    }

    log.info(`PDF generated successfully, size: ${pdfData.byteLength} bytes`);

    // Upload PDF to storage
    const timestamp = Date.now();
    const filePath = `invoices/${invoiceId}.pdf`;
    log.info('Uploading PDF to storage path:', filePath);

    // Wrap PDF data in a Blob
    const pdfBlob = new Blob([pdfData], {
      type: 'application/pdf'
    });

    // Remove existing file first
    try {
      await supabase.storage.from('invoice-pdfs').remove([filePath]);
      log.info('Removed existing PDF file if it existed');
    } catch (removeError) {
      log.warn('Failed to remove existing PDF file:', removeError);
    }

    // Upload the PDF
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('invoice-pdfs')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      log.error('Error uploading PDF to storage:', uploadError);
      return new Response(JSON.stringify({
        error: `Failed to upload PDF: ${uploadError.message}`,
        debugInfo: debugMode ? debugInfo : undefined
      }), {
        headers,
        status: 500
      });
    }

    log.info('PDF uploaded successfully to storage');

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('invoice-pdfs')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      log.error('Failed to get public URL for PDF');
      return new Response(JSON.stringify({
        error: 'Failed to get public URL for PDF',
        debugInfo: debugMode ? debugInfo : undefined
      }), {
        headers,
        status: 500
      });
    }

    const pdfUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;
    log.info('Generated public URL for PDF:', pdfUrl);

    // Update the invoice with the PDF URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoiceId);

    if (updateError) {
      log.error('Error updating invoice with PDF URL:', updateError);
    } else {
      log.info('Invoice updated with PDF URL');
    }

    return new Response(JSON.stringify({
      pdfUrl,
      debugInfo: debugMode ? debugInfo : undefined
    }), {
      headers,
      status: 200
    });
  } catch (error) {
    log.error('Error processing request:', error);
    return new Response(JSON.stringify({
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      debugInfo: debugInfo
    }), {
      headers,
      status: 500
    });
  }
});
