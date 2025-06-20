
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced function to load and register fonts
async function loadAndRegisterFont(doc: any, fontName: string, fontUrl: string, fontStyle: string = 'normal') {
  try {
    console.log(`[INFO] Attempting to load font: ${fontName} ${fontStyle} from: ${fontUrl}`);
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.status} ${fontUrl}`);
    }
    const fontData = await response.arrayBuffer();
    const base64Font = btoa(String.fromCharCode(...new Uint8Array(fontData)));
    
    // Register the font with jsPDF
    doc.addFileToVFS(`${fontName}-${fontStyle}.ttf`, base64Font);
    doc.addFont(`${fontName}-${fontStyle}.ttf`, fontName, fontStyle);
    console.log(`[INFO] Successfully loaded and registered font: ${fontName} ${fontStyle}`);
    return true;
  } catch (error) {
    console.error(`[ERROR] Error loading font: ${fontName} ${fontStyle}`, error);
    console.error(`[ERROR] Stack trace:`, error.stack);
    return false;
  }
}

// Load Chinese font support
async function loadChineseFont(doc: any) {
  const fonts = [
    { name: 'NotoSansSC', url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC-Regular.ttf', style: 'normal' },
    { name: 'NotoSansSC', url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC-Bold.ttf', style: 'bold' }
  ];
  
  const results = await Promise.all(
    fonts.map(font => loadAndRegisterFont(doc, font.name, font.url, font.style))
  );
  
  const normalLoaded = results[0];
  const boldLoaded = results[1];
  
  if (!normalLoaded) {
    console.warn(`[WARN] Failed to load NotoSansSC normal, falling back to helvetica.`);
  }
  
  if (!boldLoaded) {
    console.warn(`[WARN] Failed to load NotoSansSC bold. Bold text may not render correctly with Chinese characters.`);
  }
  
  if (!normalLoaded && !boldLoaded) {
    console.warn(`[WARN] Chinese font not loaded, using Helvetica fallback. Chinese characters may not render correctly.`);
    return false;
  }
  
  return normalLoaded || boldLoaded;
}

// Enhanced HTML stripping function that preserves paragraph structure
function stripHtml(html: string): string {
  if (!html) return '';
  
  // Replace common HTML entities first
  let text = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '...');
  
  // Convert line breaks and paragraphs to newlines
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '');
  
  // Convert list items to bullet points
  text = text
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');
  
  // Convert headings to maintain structure
  text = text
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h[1-6][^>]*>/gi, '');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace and normalize line breaks
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');
  
  return text;
}

// Smart text breaking function that respects paragraph boundaries
function breakTextAtParagraphs(text: string, maxLength: number): { content: string; wasTruncated: boolean } {
  if (text.length <= maxLength) {
    return { content: text, wasTruncated: false };
  }
  
  // Find the last paragraph break before the limit
  const searchText = text.substring(0, maxLength);
  const lastParagraphBreak = Math.max(
    searchText.lastIndexOf('\n\n'),
    searchText.lastIndexOf('\n• ')
  );
  
  if (lastParagraphBreak > maxLength * 0.7) { // Only use if it's not too short
    const truncatedContent = text.substring(0, lastParagraphBreak).trim();
    return { 
      content: truncatedContent + '\n\n[Content continues in full contract...]', 
      wasTruncated: true 
    };
  }
  
  // Fall back to sentence break
  const lastSentenceEnd = Math.max(
    searchText.lastIndexOf('. '),
    searchText.lastIndexOf('.\n')
  );
  
  if (lastSentenceEnd > maxLength * 0.8) {
    const truncatedContent = text.substring(0, lastSentenceEnd + 1).trim();
    return { 
      content: truncatedContent + '\n\n[Content continues in full contract...]', 
      wasTruncated: true 
    };
  }
  
  // Last resort: cut at word boundary
  const lastSpace = searchText.lastIndexOf(' ');
  const cutPoint = lastSpace > maxLength * 0.9 ? lastSpace : maxLength;
  const truncatedContent = text.substring(0, cutPoint).trim();
  
  return { 
    content: truncatedContent + '\n\n[Content continues in full contract...]', 
    wasTruncated: true 
  };
}

// Enhanced text wrapping with better line height handling
function wrapText(doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5) {
  const lines = doc.splitTextToSize(text, maxWidth);
  let currentY = y;
  
  lines.forEach((line: string, index: number) => {
    if (currentY > 280) { // Near bottom of page
      doc.addPage();
      currentY = 15;
    }
    doc.text(line, x, currentY);
    currentY += lineHeight;
  });
  
  return currentY;
}

// Enhanced paragraph processing with better spacing
function processParagraphs(text: string): Array<{text: string, isHeading: boolean, yPosition: number}> {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const processedParagraphs: Array<{text: string, isHeading: boolean, yPosition: number}> = [];
  let currentY = 25;
  
  paragraphs.forEach((paragraph, index) => {
    const trimmedParagraph = paragraph.trim();
    if (trimmedParagraph.length === 0) return;
    
    // Check if it's a heading (usually shorter and may contain bold formatting indicators)
    const isHeading = trimmedParagraph.length < 100 && 
                     (trimmedParagraph.includes('**') || 
                      /^[A-Z][^.]*$/.test(trimmedParagraph) ||
                      trimmedParagraph.endsWith(':'));
    
    processedParagraphs.push({
      text: trimmedParagraph,
      isHeading: isHeading,
      yPosition: currentY
    });
    
    console.log(`[DEBUG] Paragraph ${index + 1}: {`, 
      `text: '${trimmedParagraph.substring(0, 50)}',`, 
      `isHeading: ${isHeading},`, 
      `yPosition: ${currentY}`, 
      `}`);
    
    // Add more space after headings
    currentY += isHeading ? 15 : 10;
  });
  
  return processedParagraphs;
}

// Main PDF generation function
async function generatePDF(invoiceData: any, companyData: any, clientData: any, jobData: any): Promise<Uint8Array> {
  console.log(`[INFO] Generating PDF for invoice: ${invoiceData.number}`);
  console.log(`[INFO] Generating PDF for invoice: ${invoiceData.id}`);
  
  // Log overview of what data we have
  console.log(`[DEBUG] Invoice data overview: {`, 
    `hasClient: ${!!clientData},`, 
    `hasCompany: ${!!companyData},`, 
    `hasJob: ${!!jobData},`, 
    `hasItems: ${!!invoiceData.items},`, 
    `hasPaymentSchedules: ${!!invoiceData.paymentSchedules},`, 
    `hasNotes: ${!!invoiceData.notes},`, 
    `hasContractTerms: ${!!invoiceData.contractTerms},`, 
    `contractTermsLength: ${invoiceData.contractTerms?.length || 0},`, 
    `contractTermsPreview: '${invoiceData.contractTerms?.substring(0, 100) || 'N/A'}',`, 
    `companyLogoUrl: ${companyData?.logo_url || 'N/A'},`, 
    `hasPaymentMethods: ${!!companyData?.payment_methods}`, 
    `}`);

  const doc = new jsPDF();
  
  // Try to load Chinese font support
  await loadChineseFont(doc);
  
  // Add company logo if available
  if (companyData?.logo_url) {
    console.log(`[DEBUG] Adding optimized logo to PDF`);
    try {
      console.log(`[DEBUG] Processing logo for PDF: ${companyData.logo_url}`);
      
      const logoResponse = await fetch(companyData.logo_url);
      const logoBlob = await logoResponse.blob();
      console.log(`[DEBUG] Logo blob fetched, size: ${logoBlob.size}`);
      
      const logoArrayBuffer = await logoBlob.arrayBuffer();
      const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoArrayBuffer)));
      console.log(`[DEBUG] Logo converted to base64, length: ${logoBase64.length}`);
      
      // Create a temporary image to get dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `data:image/png;base64,${logoBase64}`;
      });
      
      console.log(`[DEBUG] Original logo dimensions: { width: ${img.width}, height: ${img.height}, aspectRatio: ${img.width / img.height} }`);
      
      // Calculate dimensions maintaining aspect ratio
      const maxWidth = 50;
      const maxHeight = 40;
      const aspectRatio = img.width / img.height;
      
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;
      
      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }
      
      console.log(`[DEBUG] Calculated logo dimensions maintaining aspect ratio: { width: ${logoWidth}, height: ${logoHeight} }`);
      
      // Add logo to PDF
      doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 15, 15, logoWidth, logoHeight);
      console.log(`[DEBUG] Optimized logo added to PDF successfully`);
    } catch (error) {
      console.error(`[ERROR] Failed to add logo to PDF:`, error);
    }
  }

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 105, 30, { align: 'center' });
  
  // Invoice details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoiceData.number || 'N/A'}`, 15, 70);
  doc.text(`Date: ${invoiceData.date ? new Date(invoiceData.date).toLocaleDateString() : 'N/A'}`, 15, 80);
  doc.text(`Due Date: ${invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString() : 'N/A'}`, 15, 90);
  
  // Company details
  if (companyData) {
    doc.text('From:', 15, 110);
    doc.text(companyData.name || '', 15, 120);
    if (companyData.address) {
      const addressLines = companyData.address.split('\n');
      addressLines.forEach((line: string, index: number) => {
        doc.text(line, 15, 130 + (index * 8));
      });
    }
  }
  
  // Client details
  if (clientData) {
    doc.text('To:', 105, 110);
    doc.text(clientData.name || '', 105, 120);
    if (clientData.address) {
      const addressLines = clientData.address.split('\n');
      addressLines.forEach((line: string, index: number) => {
        doc.text(line, 105, 130 + (index * 8));
      });
    }
  }

  let currentY = 180; // Start position for invoice items

  // Invoice Items Section
  console.log(`[DEBUG] Rendering INVOICE ITEMS section`);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE ITEMS', 15, currentY);
  currentY += 10;

  // Items table
  if (invoiceData.items && invoiceData.items.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Table headers
    doc.text('Item', 15, currentY);
    doc.text('Qty', 120, currentY);
    doc.text('Rate', 140, currentY);
    doc.text('Amount', 170, currentY);
    currentY += 8;
    
    // Draw header line
    doc.line(15, currentY, 195, currentY);
    currentY += 5;
    
    doc.setFont('helvetica', 'normal');
    
    invoiceData.items.forEach((item: any) => {
      const itemName = item.name || item.packageName || 'Unnamed Item';
      const itemDescription = item.description || '';
      const quantity = item.quantity || 1;
      const rate = item.rate || item.price || 0;
      const amount = item.amount || (quantity * rate);
      
      console.log(`[DEBUG] Invoice item row: {`, 
        `name: "${itemName}",`, 
        `description: "${itemDescription}",`, 
        `quantity: "${quantity}",`, 
        `rate: "${rate.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}",`, 
        `amount: "${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}"`, 
        `}`);
      
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 15;
      }
      
      // Item name and description
      let itemText = itemName;
      if (itemDescription) {
        itemText += `\n${itemDescription}`;  
      }
      
      const itemLines = doc.splitTextToSize(itemText, 100);
      itemLines.forEach((line: string, index: number) => {
        doc.text(line, 15, currentY + (index * 4));
      });
      
      const itemHeight = Math.max(itemLines.length * 4, 8);
      
      // Quantity, Rate, Amount
      doc.text(quantity.toString(), 120, currentY);
      doc.text(rate.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), 140, currentY);
      doc.text(amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), 170, currentY);
      
      currentY += itemHeight + 2;
    });
    
    // Total line
    currentY += 5;
    doc.line(15, currentY, 195, currentY);
    currentY += 8;
    
    console.log(`[DEBUG] Total amount: ${invoiceData.amount}`);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 140, currentY);
    doc.text((invoiceData.amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), 170, currentY);
    currentY += 15;
  }

  console.log(`[DEBUG] Invoice items table drawn, new y position: ${currentY}`);

  // Check if we need a new page for payment schedule
  if (currentY > 200) {
    doc.addPage();
    currentY = 15;
    console.log(`[DEBUG] Added new page for payment schedule, new y position: ${currentY}`);
  }

  // Payment Schedule Section
  if (invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0) {
    console.log(`[DEBUG] Rendering PAYMENT SCHEDULE section`);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT SCHEDULE', 15, currentY);
    currentY += 10;

    // Payment schedule table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Table headers
    doc.text('Description', 15, currentY);
    doc.text('Due Date', 70, currentY);
    doc.text('Percentage', 110, currentY);
    doc.text('Amount', 140, currentY);
    doc.text('Status', 170, currentY);
    currentY += 8;
    
    // Draw header line
    doc.line(15, currentY, 195, currentY);
    currentY += 5;
    
    doc.setFont('helvetica', 'normal');
    
    invoiceData.paymentSchedules.forEach((schedule: any) => {
      const description = schedule.description || 'Payment';
      const dueDate = schedule.dueDate ? new Date(schedule.dueDate).toLocaleDateString() : 'TBD';
      const percentage = schedule.percentage ? `${schedule.percentage}%` : 'N/A';
      const amount = schedule.amount ? schedule.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'TBD';
      const status = schedule.status === 'paid' ? 'PAID' : 'UNPAID';
      
      console.log(`[DEBUG] Payment schedule row: {`, 
        `description: "${description}",`, 
        `dueDate: "${dueDate}",`, 
        `percentage: "${percentage}",`, 
        `amount: "${amount}",`, 
        `status: "${status}"`, 
        `}`);
      
      // Check if we need a new page
      if (currentY > 270) {
        doc.addPage();
        currentY = 15;
      }
      
      doc.text(description, 15, currentY);
      doc.text(dueDate, 70, currentY);
      doc.text(percentage, 110, currentY);
      doc.text(amount, 140, currentY);
      doc.text(status, 170, currentY);
      
      currentY += 8;
    });
    
    currentY += 10;
  }

  console.log(`[DEBUG] Payment schedule table drawn, new y position: ${currentY}`);

  // Payment Methods Section
  if (companyData?.payment_methods) {
    console.log(`[DEBUG] Rendering PAYMENT METHODS section`);
    
    // Check if we need a new page for payment methods
    if (currentY > 220) {
      doc.addPage();
      currentY = 15;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT METHODS', 15, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const paymentMethodsText = companyData.payment_methods;
    console.log(`[DEBUG] Payment methods content: ${paymentMethodsText}`);
    
    currentY = wrapText(doc, paymentMethodsText, 15, currentY, 165, 5);
    currentY += 15;
  }
  
  console.log(`[DEBUG] Payment methods section drawn, new y position: ${currentY}`);

  // Notes Section
  if (invoiceData.notes && invoiceData.notes.trim()) {
    console.log(`[DEBUG] Rendering NOTES section`);
    
    // Check if we need a new page for notes
    if (currentY > 220) {
      doc.addPage();
      currentY = 15;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 15, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const cleanNotes = stripHtml(invoiceData.notes);
    currentY = wrapText(doc, cleanNotes, 15, currentY, 165, 5);
    currentY += 15;
  } else {
    console.log(`[DEBUG] No notes to render`);
  }

  // Contract Terms Section - Enhanced Processing
  if (invoiceData.contractTerms && invoiceData.contractTerms.trim()) {
    console.log(`[DEBUG] Rendering CONTRACT TERMS section`);
    
    const contractTermsLength = invoiceData.contractTerms.length;
    if (contractTermsLength > 20000) {
      console.warn(`[WARN] Contract terms are very long: ${contractTermsLength}`);
    }
    
    // Check if we need a new page for contract terms
    if (currentY > 200) {
      doc.addPage();
      currentY = 15;
      console.log(`[DEBUG] Added new page for contract terms, new y position: ${currentY}`);
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRACT TERMS', 15, currentY);
    currentY += 10;
    
    doc.setFontSize(9); // Smaller font for contract terms
    doc.setFont('helvetica', 'normal');
    
    // Enhanced HTML stripping and text processing
    const cleanContractTerms = stripHtml(invoiceData.contractTerms);
    
    // Smart truncation with increased limit
    const { content: processedTerms, wasTruncated } = breakTextAtParagraphs(cleanContractTerms, 50000);
    
    if (wasTruncated) {
      console.warn(`[WARN] Contract terms were truncated due to length. Original: ${cleanContractTerms.length}, Processed: ${processedTerms.length}`);
    }
    
    // Process into paragraphs for better formatting
    const paragraphs = processParagraphs(processedTerms);
    console.log(`[DEBUG] Contract terms paragraphs: [${paragraphs.map(p => `'${p.text.substring(0, 100)}...'`).join(', ')}]`);
    
    paragraphs.forEach((paragraph, index) => {
      console.log(`[DEBUG] Paragraph ${index + 1}: {`, 
        `text: '${paragraph.text.substring(0, 50)}',`, 
        `isHeading: ${paragraph.isHeading},`, 
        `yPosition: ${paragraph.yPosition}`, 
        `}`);
      
      // Check if we need a new page
      if (currentY > 270) {
        doc.addPage();
        currentY = 15;
      }
      
      // Set font style based on whether it's a heading
      if (paragraph.isHeading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      
      // Wrap and add the text
      currentY = wrapText(doc, paragraph.text, 15, currentY, 165, paragraph.isHeading ? 6 : 4);
      currentY += paragraph.isHeading ? 8 : 5; // Extra space after headings
    });
    
    currentY += 10;
  }

  // Add footer to all pages with generation info and acceptance status
  const pageCount = doc.internal.getNumberOfPages();
  const generatedText = `Generated on ${new Date().toLocaleDateString()}`;
  
  // Determine acceptance status
  const isInvoiceAccepted = invoiceData.status === 'accepted' || invoiceData.status === 'paid' || !!invoiceData.invoice_accepted_at;
  const isContractAccepted = !!(invoiceData.contract_accepted_at || invoiceData.contract_accepted_by || (invoiceData.contractStatus === 'accepted'));
  
  let statusText = '';
  if (isInvoiceAccepted && isContractAccepted) {
    statusText = 'Invoice accepted | Contract terms accepted';
  } else if (isInvoiceAccepted && !isContractAccepted) {
    statusText = 'Invoice accepted | Contract terms not accepted';
  } else if (!isInvoiceAccepted && isContractAccepted) {
    statusText = 'Invoice not accepted | Contract terms accepted';
  } else {
    statusText = 'Invoice not accepted | Contract terms not accepted';
  }

  console.log(`[DEBUG] Adding footer to ${pageCount} pages`);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    
    console.log(`[DEBUG] Footer for page ${i}: {`, 
      `generatedText: "${generatedText}",`, 
      `statusText: "${statusText}"`, 
      `}`);
    
    // Left side: Generated date
    doc.text(generatedText, 15, 285);
    
    // Center: Acceptance status
    doc.text(statusText, 105, 285, { align: 'center' });
    
    // Right side: Page number
    doc.text(`Page ${i} of ${pageCount}`, 195, 285, { align: 'right' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
  }

  console.log(`[INFO] PDF generation completed`);
  
  // Convert to array buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  console.log(`[DEBUG] PDF array buffer generated, size: ${pdfArrayBuffer.byteLength}`);
  
  const pdfUint8Array = new Uint8Array(pdfArrayBuffer);
  console.log(`[INFO] PDF generated successfully, size: ${pdfUint8Array.length} bytes (${(pdfUint8Array.length / 1024 / 1024).toFixed(2)} MB)`);
  
  return pdfUint8Array;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, forceRegenerate = false, debugMode = false, skipSizeValidation = false, allowLargeFiles = false, clientInfo = {} } = await req.json();
    
    console.log(`[INFO] Received request to generate PDF for invoice: {`, 
      `invoiceId: "${invoiceId}",`, 
      `forceRegenerate: ${forceRegenerate},`, 
      `debugMode: ${debugMode},`, 
      `skipSizeValidation: ${skipSizeValidation},`, 
      `allowLargeFiles: ${allowLargeFiles},`, 
      `clientInfo: ${JSON.stringify(clientInfo)}`, 
      `}`);

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch invoice data with related information
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        payment_schedules (
          id,
          due_date,
          percentage,
          description,
          status,
          payment_date,
          amount
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoiceData) {
      console.error('Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[INFO] Fetched invoice data successfully. Invoice number: ${invoiceData.number}`);

    // Fetch company data
    console.log(`[DEBUG] Invoice company_id: ${invoiceData.company_id}`);
    const { data: companyData, error: companyError } = await supabase
      .from('company_clientview')
      .select('*')
      .eq('company_id', invoiceData.company_id)
      .single();

    if (companyError) {
      console.error('Error fetching company data:', companyError);
    } else {
      console.log(`[DEBUG] Fetched company data from company_clientview: ${JSON.stringify(companyData, null, 2)}`);
    }

    // Fetch client data
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoiceData.client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client data:', clientError);
    }

    // Fetch job data
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', invoiceData.job_id)
      .single();

    if (jobError) {
      console.error('Error fetching job data:', jobError);
    }

    // Prepare invoice data for PDF generation
    const formattedInvoiceData = {
      ...invoiceData,
      paymentSchedules: invoiceData.payment_schedules || [],
      items: invoiceData.items || []
    };

    // Generate PDF
    const pdfData = await generatePDF(formattedInvoiceData, companyData, clientData, jobData);

    // Store PDF in Supabase Storage
    const fileName = `${invoiceId}.pdf`;
    const filePath = `invoices/${fileName}`;
    
    console.log(`[INFO] Uploading PDF to storage path: ${filePath}`);
    console.log(`[DEBUG] PDF data before upload: { type: "${pdfData.constructor.name}", size: ${pdfData.length}, signature: "${String.fromCharCode(...pdfData.slice(0, 5))}" }`);

    const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
    console.log(`[DEBUG] PDF Blob details: { size: ${pdfBlob.size}, type: "${pdfBlob.type}" }`);

    // Remove existing file if it exists
    await supabase.storage
      .from('invoice-pdfs')
      .remove([filePath]);
    console.log(`[INFO] Removed existing PDF file if it existed: ${filePath}`);

    // Upload new PDF
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF', details: uploadError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[INFO] PDF uploaded successfully to storage`);
    console.log(`[DEBUG] PDF file storage details: ${JSON.stringify(uploadData, null, 2)}`);

    // Generate public URL
    const { data: publicUrlData } = supabase.storage
      .from('invoice-pdfs')
      .getPublicUrl(filePath, {
        transform: {
          quality: 100
        }
      });

    const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    console.log(`[INFO] Generated public URL for PDF: ${publicUrl}`);

    // Verify the uploaded PDF
    try {
      const verificationResponse = await fetch(publicUrl, { method: 'HEAD' });
      console.log(`[DEBUG] Verification of uploaded PDF: {`, 
        `url: "${publicUrl}",`, 
        `status: ${verificationResponse.status},`, 
        `contentType: "${verificationResponse.headers.get('content-type')}",`, 
        `contentLength: "${verificationResponse.headers.get('content-length')}"`, 
        `}`);
      
      if (verificationResponse.ok) {
        console.log(`[INFO] Uploaded PDF verified successfully`);
      } else {
        console.warn(`[WARN] PDF verification returned status: ${verificationResponse.status}`);
      }
    } catch (verifyError) {
      console.warn(`[WARN] Could not verify uploaded PDF:`, verifyError);
    }

    // Update invoice record with PDF URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: publicUrl })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice with PDF URL:', updateError);
    } else {
      console.log(`[INFO] Invoice updated with PDF URL`);
    }

    return new Response(
      JSON.stringify({ 
        pdfUrl: publicUrl,
        debugInfo: debugMode ? {
          invoiceId,
          fileName,
          filePath,
          pdfSize: pdfData.length,
          uploadSuccess: !uploadError,
          publicUrl
        } : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in PDF generation:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
