
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

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Helper function to add wrapped text with page breaks
function addWrappedText(doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number, pageHeight: number, margin: number): number {
  const cleanText = stripHtml(text);
  const lines = doc.splitTextToSize(cleanText, maxWidth);
  
  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines[i], x, y);
    y += lineHeight;
  }
  
  return y;
}

// Helper function to process logo for PDF
async function processLogoForPDF(logoUrl: string): Promise<{data: string, width: number, height: number}> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Standard logo dimensions for PDF
    const maxWidth = 40;
    const maxHeight = 25;
    
    return {
      data: `data:image/jpeg;base64,${base64}`,
      width: maxWidth,
      height: maxHeight
    };
  } catch (error) {
    log.error('Error processing logo:', error);
    throw error;
  }
}

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

// Enhanced PDF generation function
async function generatePDF(invoiceData: any): Promise<Uint8Array> {
  log.info('Generating PDF for invoice:', invoiceData.number);
  log.debug('Invoice data overview:', {
    hasClient: !!invoiceData.client,
    hasCompany: !!invoiceData.company,
    hasJob: !!invoiceData.job,
    hasItems: !!invoiceData.items && invoiceData.items.length > 0,
    hasPaymentSchedules: !!invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0,
    hasNotes: !!invoiceData.notes,
    hasContractTerms: !!invoiceData.contractTerms,
    contractTermsLength: invoiceData.contractTerms?.length || 0,
    contractTermsPreview: invoiceData.contractTerms?.slice(0, 100),
    companyLogoUrl: invoiceData.company.logoUrl,
    hasPaymentMethods: !!invoiceData.company.payment_methods
  });

  try {
    // Create a new PDF document with optimized settings
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Load Chinese font
    const fontLoaded = await loadChineseFont(doc);
    if (!fontLoaded) {
      log.warn('Chinese font not loaded, using Helvetica fallback. Chinese characters may not render correctly.');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Add page footer helper function
    const addPageFooter = () => {
      const totalPages = doc.getNumberOfPages();
      log.debug('Adding footer to', totalPages, 'pages');
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        const generatedText = `Generated on ${new Date().toLocaleDateString()}`;
        const statusText = `${invoiceData.status === 'accepted' ? 'Invoice accepted' : 'Invoice not accepted'} | ${invoiceData.contractStatus === 'accepted' ? 'Contract terms accepted' : 'Contract terms not accepted'}`;
        
        log.debug(`Footer for page ${i}:`, {
          generatedText,
          statusText
        });
        
        doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
        doc.text(generatedText, margin, pageHeight - 10);
        doc.text(statusText, pageWidth - margin, pageHeight - 10, {
          align: 'right'
        });
      }
    };

    // Header Layout
    const rightColumnX = pageWidth * 0.55;
    let rightColumnY = y;
    let leftColumnY = y;

    // Optimized logo handling with proper aspect ratio
    if (invoiceData.company.logoUrl) {
      log.debug('Adding optimized logo to PDF');
      try {
        const logoData = await processLogoForPDF(invoiceData.company.logoUrl);
        const logoWidth = logoData.width;
        const logoHeight = logoData.height;
        const logoX = margin + (rightColumnX - margin - logoWidth) / 4;
        
        doc.addImage(logoData.data, 'JPEG', logoX, y, logoWidth, logoHeight, undefined, 'MEDIUM');
        log.debug('Optimized logo added to PDF successfully');
        leftColumnY += logoHeight + 10;
      } catch (logoError) {
        log.error('Error adding optimized logo:', logoError);
        doc.setFontSize(24);
        doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
        doc.text(invoiceData.company.name.toUpperCase(), margin, leftColumnY + 15);
        leftColumnY += 20;
      }
    } else {
      doc.setFontSize(24);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
      doc.text(invoiceData.company.name.toUpperCase(), margin, leftColumnY + 15);
      leftColumnY += 20;
    }

    // Company details below logo
    doc.setFontSize(12);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('FROM', margin, leftColumnY);
    leftColumnY += 7;

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(invoiceData.company.name, margin, leftColumnY);
    leftColumnY += 7;

    doc.setFontSize(10);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
    
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

    // Client Information
    doc.setFontSize(12);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('INVOICE FOR', rightColumnX, rightColumnY);
    rightColumnY += 7;

    if (invoiceData.job && invoiceData.job.title) {
      let fontSize = 10;
      const minFontSize = 8;
      const rightColumnWidth = pageWidth - rightColumnX - margin;
      let jobTitleBlock = [];
      let titleToShow = invoiceData.job.title;
      let didEllipsis = false;

      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      while (fontSize >= minFontSize) {
        doc.setFontSize(fontSize);
        jobTitleBlock = doc.splitTextToSize(titleToShow, rightColumnWidth);
        if (jobTitleBlock.length <= 2) break;
        fontSize -= 1;
      }

      if (jobTitleBlock.length > 2) {
        const fullText = invoiceData.job.title;
        let truncated = fullText;
        let fits = false;

        for (let len = fullText.length; len > 0; len--) {
          const attempt = fullText.slice(0, len) + '...';
          const lines = doc.splitTextToSize(attempt, rightColumnWidth);
          if (lines.length <= 2) {
            truncated = attempt;
            fits = true;
            jobTitleBlock = lines;
            didEllipsis = true;
            break;
          }
        }

        if (!fits) {
          jobTitleBlock = [
            jobTitleBlock[0],
            jobTitleBlock[1].slice(0, -3) + '...'
          ];
          didEllipsis = true;
        }
      }

      for (let i = 0; i < jobTitleBlock.length && i < 2; i++) {
        doc.text(jobTitleBlock[i], rightColumnX, rightColumnY + i * (fontSize + 1));
      }
      rightColumnY += jobTitleBlock.length * (fontSize + 1) + 2;

      if (didEllipsis) {
        log.debug('Job title too long, used ellipsis/truncate:', jobTitleBlock);
      }
    }

    doc.setFontSize(10);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
    
    if (invoiceData.client.email) {
      doc.text(invoiceData.client.email, rightColumnX, rightColumnY);
      rightColumnY += 6;
    }
    if (invoiceData.client.phone) {
      doc.text(invoiceData.client.phone, rightColumnX, rightColumnY);
      rightColumnY += 6;
    }

    if (invoiceData.job && invoiceData.job.date) {
      rightColumnY += 4;
      doc.setFontSize(12);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('JOB DATE', rightColumnX, rightColumnY);
      rightColumnY += 7;

      doc.setFontSize(10);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(invoiceData.job.date, rightColumnX, rightColumnY);
    }

    y = Math.max(leftColumnY + 10, rightColumnY + 10);

    // Separator line
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Invoice Number and Details
    doc.setFontSize(14);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
    doc.text(`INVOICE #${invoiceData.number}`, margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');

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
        font: fontLoaded ? 'NotoSansSC' : 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Invoice Items
    if (invoiceData.items && invoiceData.items.length > 0) {
      log.debug('Rendering INVOICE ITEMS section');
      doc.setFontSize(12);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.text('INVOICE ITEMS', margin, y);
      y += 5;

      const tableHeaders = [
        { header: 'Product/Service Name', dataKey: 'name' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Quantity', dataKey: 'quantity' },
        { header: 'Unit Price', dataKey: 'rate' },
        { header: 'Amount', dataKey: 'amount' }
      ];

      const tableData = invoiceData.items.map((item: any) => {
        const row = {
          name: item.name || 'Product/Service',
          description: stripHtml(item.description || ''),
          quantity: item.quantity.toString(),
          rate: `HK$${item.rate.toFixed(2)}`,
          amount: `HK$${item.amount.toFixed(2)}`
        };
        log.debug('Invoice item row:', row);
        return row;
      });

      autoTable(doc, {
        head: [tableHeaders.map((h) => h.header)],
        body: tableData.map((row) => tableHeaders.map((h) => row[h.dataKey])),
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
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          font: fontLoaded ? 'NotoSansSC' : 'helvetica'
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        },
        theme: 'grid',
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
          font: fontLoaded ? 'NotoSansSC' : 'helvetica'
        },
        didDrawPage: (data: any) => {
          y = data.cursor.y + 5;
          log.debug('Invoice items table drawn, new y position:', y);
        }
      });

      doc.setFontSize(10);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      log.debug('Total amount:', invoiceData.amount);
      doc.text('Subtotal:', pageWidth - margin - 35, y);
      doc.text(`HK$${invoiceData.amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      y += 15;
    } else {
      log.debug('No invoice items to render');
    }

    // Payment Schedule
    if (invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0) {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin;
        log.debug('Added new page for payment schedule, new y position:', y);
      }

      log.debug('Rendering PAYMENT SCHEDULE section');
      doc.setFontSize(12);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
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

      const paymentData = invoiceData.paymentSchedules.map((schedule: any) => {
        const row = {
          description: schedule.description || '',
          dueDate: new Date(schedule.dueDate).toLocaleDateString(),
          percentage: schedule.percentage ? `${schedule.percentage}%` : 'N/A',
          amount: `HK$${schedule.amount.toFixed(2)}`,
          status: schedule.status.toUpperCase()
        };
        log.debug('Payment schedule row:', row);
        return row;
      });

      autoTable(doc, {
        head: [paymentHeaders.map((h) => h.header)],
        body: paymentData.map((row) => paymentHeaders.map((h) => row[h.dataKey])),
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
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          font: fontLoaded ? 'NotoSansSC' : 'helvetica'
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
          font: fontLoaded ? 'NotoSansSC' : 'helvetica'
        },
        didDrawPage: (data: any) => {
          y = data.cursor.y + 10;
          log.debug('Payment schedule table drawn, new y position:', y);
        }
      });
    } else {
      log.debug('No payment schedules to render');
    }

    // Payment Methods - Enhanced with Chinese support
    if (invoiceData.company.payment_methods) {
      if (y > pageHeight - 70) {
        doc.addPage();
        y = margin;
        log.debug('Added new page for payment methods, new y position:', y);
      }

      log.debug('Rendering PAYMENT METHODS section');
      doc.setFontSize(12);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.text('PAYMENT METHODS', margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
      log.debug('Payment methods content:', invoiceData.company.payment_methods);

      const paymentMethodsY = addWrappedText(doc, invoiceData.company.payment_methods, margin, y, contentWidth, 5, pageHeight, margin);
      y = paymentMethodsY + 15;
      log.debug('Payment methods section drawn, new y position:', y);
    } else {
      log.debug('No payment methods to render');
    }

    // Notes
    if (invoiceData.notes) {
      if (y > pageHeight - 70) {
        doc.addPage();
        y = margin;
        log.debug('Added new page for notes, new y position:', y);
      }

      log.debug('Rendering NOTES section');
      doc.setFontSize(12);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.text('NOTES', margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
      log.debug('Notes content:', invoiceData.notes);

      const notesY = addWrappedText(doc, invoiceData.notes, margin, y, contentWidth, 5, pageHeight, margin);
      y = notesY + 15;
      log.debug('Notes section drawn, new y position:', y);
    } else {
      log.debug('No notes to render');
    }

    // Contract Terms
    if (invoiceData.contractTerms) {
      log.debug('Rendering CONTRACT TERMS section');
      doc.addPage();
      y = margin;
      log.debug('Added new page for contract terms, new y position:', y);

      doc.setFontSize(14);
      doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
      doc.text('CONTRACT TERMS', margin, y);
      y += 10;

      const paragraphs = invoiceData.contractTerms.split('\n\n');
      doc.setFontSize(9);
      log.debug('Contract terms paragraphs:', paragraphs);

      paragraphs.forEach((paragraph: string, index: number) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
          log.debug(`Added new page for contract terms paragraph ${index + 1}, new y position:`, y);
        }

        const trimmedParagraph = paragraph.trim();
        const isHeading = trimmedParagraph.length < 50 && trimmedParagraph.toUpperCase() === trimmedParagraph;

        log.debug(`Paragraph ${index + 1}:`, {
          text: trimmedParagraph.substring(0, 50),
          isHeading,
          yPosition: y
        });

        if (isHeading) {
          doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'bold');
          addWrappedText(doc, trimmedParagraph, margin, y, contentWidth, 5, pageHeight, margin);
          y += 7;
        } else {
          doc.setFont(fontLoaded ? 'NotoSansSC' : 'helvetica', 'normal');
          const paragraphY = addWrappedText(doc, trimmedParagraph, margin, y, contentWidth, 5, pageHeight, margin);
          y = paragraphY + 5;
        }
      });
    }

    // Add footers
    addPageFooter();

    log.info('PDF generation completed');

    // Generate PDF array buffer with compression
    const pdfArrayBuffer = doc.output('arraybuffer');
    log.debug('PDF array buffer generated, size:', pdfArrayBuffer.byteLength, 'bytes');

    // Validate PDF signature
    const pdfView = new Uint8Array(pdfArrayBuffer);
    const pdfSignature = new TextDecoder().decode(pdfView.slice(0, 5));
    if (pdfSignature !== '%PDF-') {
      log.error('Generated PDF has invalid signature:', pdfSignature);
      throw new Error('Invalid PDF generated - missing PDF signature');
    }

    return pdfView;
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

    // Create the final URL with proper separator
    const baseUrl = publicUrlData.publicUrl;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const pdfUrl = `${baseUrl}${separator}t=${timestamp}`;
    
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
