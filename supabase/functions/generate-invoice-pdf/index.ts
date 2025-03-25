import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import jspdf from 'https://esm.sh/jspdf@2.5.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Define types based on your database schema
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
  };
  items: {
    id: string;
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

// Supabase client setup
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Set CORS headers for browser clients
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  try {
    const { invoiceId } = await req.json();
    console.log('Received request to generate PDF for invoice:', invoiceId);

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: invoiceId' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), payment_schedules(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch invoice data' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Log contract terms to verify it's being fetched
    console.log('Fetched invoice contract terms:', {
      hasContractTerms: !!invoice.contract_terms,
      contractTermsLength: invoice.contract_terms?.length || 0,
      preview: invoice.contract_terms?.substring(0, 100)
    });

    // Fetch associated data
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', invoice.company_id)
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

    // Format invoice data for the PDF generation
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
      company: company || { id: 'unknown', name: 'Unknown Company' },
      job: job ? {
        id: job.id,
        title: job.title,
        description: job.description,
        date: job.date,
      } : undefined,
      items: (invoice.invoice_items || []).map((item: InvoiceItem) => ({
        id: item.id,
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

    console.log('Uploading PDF for invoice:', invoiceId);
    const pdfData = await generatePDF(formattedInvoice);

    // Upload PDF to Storage bucket
    const filePath = `invoices/${invoiceId}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('invoice-pdfs')
      .upload(filePath, pdfData, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get public URL for the PDF
    const { data: publicUrlData } = supabase
      .storage
      .from('invoice-pdfs')
      .getPublicUrl(filePath);

    // Generate and store static HTML version
    console.log('Generating static HTML for invoice:', invoiceId);
    const htmlContent = generateStaticHtml(formattedInvoice);
    
    // Store HTML content in a separate table
    const { error: htmlError } = await supabase
      .from('invoice_static_html')
      .upsert({
        invoice_id: invoiceId,
        html_content: htmlContent,
        generated_at: new Date().toISOString(),
      });

    if (htmlError) {
      console.error('Error storing HTML content:', htmlError);
      // Continue with PDF response even if HTML storage fails
    } else {
      console.log('Static HTML generated and stored successfully for invoice:', invoiceId);
    }

    // Update invoice with PDF URL
    await supabase
      .from('invoices')
      .update({ pdf_url: publicUrlData.publicUrl })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({ pdfUrl: publicUrlData.publicUrl }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to strip HTML tags and format text
function stripHtml(html: string): string {
  if (!html) return '';
  
  // Replace <br>, </p>, </div>, </li> with newlines
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n');
  
  // Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Normalize whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

// Helper function to add text with wrapping
function addWrappedText(doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 7): number {
  if (!text) return y;
  
  const cleanText = stripHtml(text);
  const lines = doc.splitTextToSize(cleanText, maxWidth);
  
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], x, y + (i * lineHeight));
  }
  
  return y + (lines.length * lineHeight);
}

async function generatePDF(invoiceData: FormattedInvoice): Promise<Uint8Array> {
  console.log('Generating PDF for invoice:', invoiceData.number);
  console.log('Contract terms length:', invoiceData.contractTerms?.length || 0);
  
  try {
    const doc = new jspdf({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let y = margin;
    
    // Add company logo if available
    if (invoiceData.company.logoUrl) {
      try {
        const response = await fetch(invoiceData.company.logoUrl);
        const blob = await response.blob();
        const logo = await blobToBase64(blob);
        
        // Calculate logo dimensions (max height 30mm, maintain aspect ratio)
        const maxLogoHeight = 30;
        const imgProps = doc.getImageProperties(logo);
        const aspectRatio = imgProps.width / imgProps.height;
        const logoHeight = Math.min(maxLogoHeight, imgProps.height);
        const logoWidth = logoHeight * aspectRatio;
        
        // Add logo
        doc.addImage(logo, 'PNG', margin, y, logoWidth, logoHeight);
        
        y += logoHeight + 10;
      } catch (logoError) {
        console.error('Error adding logo:', logoError);
        // Continue without logo if there's an error
        y += 10;
      }
    } else {
      // Add company name if no logo
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(invoiceData.company.name, margin, y + 10);
      y += 20;
    }
    
    // Company details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const companyInfo = [];
    if (invoiceData.company.address) companyInfo.push(invoiceData.company.address);
    if (invoiceData.company.email) companyInfo.push(`Email: ${invoiceData.company.email}`);
    if (invoiceData.company.phone) companyInfo.push(`Phone: ${invoiceData.company.phone}`);
    if (invoiceData.company.website) companyInfo.push(`Website: ${invoiceData.company.website}`);
    
    companyInfo.forEach(info => {
      doc.text(info, margin, y);
      y += 5;
    });
    
    y += 5;
    
    // Invoice header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - margin - 30, margin + 10);
    
    doc.setFontSize(12);
    doc.text(`# ${invoiceData.number}`, pageWidth - margin - 30, margin + 20);
    
    // Client info box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'FD');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', margin + 5, y + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.client.name, margin + 5, y + 18);
    
    let clientDetailsY = y + 26;
    if (invoiceData.client.email) {
      doc.text(`Email: ${invoiceData.client.email}`, margin + 5, clientDetailsY);
      clientDetailsY += 6;
    }
    if (invoiceData.client.phone) {
      doc.text(`Phone: ${invoiceData.client.phone}`, margin + 5, clientDetailsY);
      clientDetailsY += 6;
    }
    if (invoiceData.client.address) {
      doc.text(`Address: ${invoiceData.client.address}`, margin + 5, clientDetailsY);
    }
    
    // Invoice details
    doc.setFontSize(11);
    
    const infoX = pageWidth - margin - 50;
    const infoLabelX = infoX - 30;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date:', infoLabelX, y + 10);
    doc.text('Due Date:', infoLabelX, y + 18);
    doc.text('Status:', infoLabelX, y + 26);
    if (invoiceData.job?.date) {
      doc.text('Job Date:', infoLabelX, y + 34);
    }
    
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(invoiceData.date).toLocaleDateString(), infoX, y + 10);
    doc.text(new Date(invoiceData.dueDate).toLocaleDateString(), infoX, y + 18);
    doc.text(invoiceData.status.toUpperCase(), infoX, y + 26);
    if (invoiceData.job?.date) {
      doc.text(new Date(invoiceData.job.date).toLocaleDateString(), infoX, y + 34);
    }
    
    y += 50;
    
    // Job details if available
    if (invoiceData.job) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('JOB DETAILS', margin, y);
      
      y += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Title: ${invoiceData.job.title}`, margin, y);
      
      y += 6;
      
      if (invoiceData.job.description) {
        const descriptionY = addWrappedText(doc, invoiceData.job.description, margin, y, contentWidth);
        y = descriptionY + 8;
      }
    }
    
    // Invoice items
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE ITEMS', margin, y);
    
    y += 8;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentWidth, 8, 'F');
    
    doc.setFontSize(10);
    doc.text('Description', margin + 5, y + 6);
    doc.text('Qty', margin + 120, y + 6);
    doc.text('Rate', margin + 140, y + 6);
    doc.text('Amount', pageWidth - margin - 20, y + 6, { align: 'right' });
    
    y += 10;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    
    for (const item of invoiceData.items) {
      const initialY = y;
      
      if (item.description) {
        const descY = addWrappedText(doc, item.description, margin + 5, y, 110);
        y = descY + 2;
      } else {
        doc.text('Product/Service', margin + 5, y);
        y += 6;
      }
      
      doc.text(item.quantity.toString(), margin + 120, initialY);
      doc.text(`$${item.rate.toFixed(2)}`, margin + 140, initialY);
      doc.text(`$${item.amount.toFixed(2)}`, pageWidth - margin - 20, initialY, { align: 'right' });
      
      y += 4;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;
    }
    
    // Total
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', margin + 140, y);
    doc.text(`$${invoiceData.amount.toFixed(2)}`, pageWidth - margin - 20, y, { align: 'right' });
    
    y += 15;
    
    // Payment schedule if available
    if (invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0) {
      doc.setFontSize(12);
      doc.text('PAYMENT SCHEDULE', margin, y);
      
      y += 8;
      
      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentWidth, 8, 'F');
      
      doc.setFontSize(10);
      doc.text('Description', margin + 5, y + 6);
      doc.text('Due Date', margin + 80, y + 6);
      doc.text('Status', margin + 130, y + 6);
      doc.text('Percentage', margin + 155, y + 6);
      doc.text('Amount', pageWidth - margin - 20, y + 6, { align: 'right' });
      
      y += 10;
      
      // Table rows
      doc.setFont('helvetica', 'normal');
      
      for (const schedule of invoiceData.paymentSchedules) {
        doc.text(schedule.description || '', margin + 5, y);
        doc.text(new Date(schedule.dueDate).toLocaleDateString(), margin + 80, y);
        doc.text(schedule.status.toUpperCase(), margin + 130, y);
        doc.text(`${schedule.percentage}%`, margin + 155, y);
        doc.text(`$${schedule.amount.toFixed(2)}`, pageWidth - margin - 20, y, { align: 'right' });
        
        y += 8;
      }
      
      y += 7;
    }
    
    // Add notes if available
    if (invoiceData.notes) {
      // Check if we need a new page
      if (y > 220) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES', margin, y);
      
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const notesY = addWrappedText(doc, invoiceData.notes, margin, y, contentWidth);
      y = notesY + 15;
    }
    
    // Add contract terms if available
    if (invoiceData.contractTerms) {
      console.log('Adding contract terms to PDF, length:', invoiceData.contractTerms.length);
      
      // Check if we need a new page
      if (y > 230) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRACT TERMS', margin, y);
      
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const contractY = addWrappedText(doc, invoiceData.contractTerms, margin, y, contentWidth);
      y = contractY + 15;
    }
    
    // Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY);
    
    if (invoiceData.viewLink) {
      const viewLinkText = `View online: ${invoiceData.viewLink}`;
      doc.text(viewLinkText, pageWidth - margin, footerY, { align: 'right' });
    }
    
    // Return PDF as buffer
    return doc.output('arraybuffer');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Helper function to convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// New function to generate static HTML
function generateStaticHtml(invoiceData: FormattedInvoice): string {
  console.log('Generating static HTML for invoice:', invoiceData.number);

  // Create a static HTML representation of the invoice
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoiceData.number}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .invoice-container {
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 40px;
      margin-bottom: 30px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .logo-container {
      max-width: 250px;
      max-height: 100px;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
    }
    .invoice-details {
      margin-bottom: 30px;
    }
    .company-details, .client-details {
      margin-bottom: 20px;
    }
    h1, h2, h3, h4 {
      color: #333;
      margin-top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      text-align: left;
      padding: 12px 15px;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f5f5f5;
      font-weight: 600;
    }
    .item-description {
      width: 50%;
    }
    .total-row td {
      font-weight: bold;
      border-top: 2px solid #333;
      border-bottom: none;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .status-draft { background-color: #f5f5f5; color: #666; }
    .status-sent { background-color: #e3f2fd; color: #0d47a1; }
    .status-accepted { background-color: #e8f5e9; color: #2e7d32; }
    .status-paid { background-color: #f3e5f5; color: #7b1fa2; }
    .contract-accepted { background-color: #e8f5e9; color: #2e7d32; }
    .tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-right: 10px;
    }
    .tab.active {
      border-bottom: 2px solid #333;
      font-weight: bold;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .payment-schedule {
      margin-top: 30px;
    }
    .notes, .contract-terms {
      margin-top: 30px;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div>
        ${invoiceData.company.logoUrl ? 
          `<div class="logo-container">
            <img src="${invoiceData.company.logoUrl}" alt="${invoiceData.company.name} Logo">
          </div>` : 
          `<h2>${invoiceData.company.name}</h2>`
        }
        <div class="company-details">
          ${invoiceData.company.address ? `<p>${invoiceData.company.address}</p>` : ''}
          ${invoiceData.company.email ? `<p>Email: ${invoiceData.company.email}</p>` : ''}
          ${invoiceData.company.phone ? `<p>Phone: ${invoiceData.company.phone}</p>` : ''}
          ${invoiceData.company.website ? `<p>Website: ${invoiceData.company.website}</p>` : ''}
        </div>
      </div>
      <div>
        <h1>INVOICE #${invoiceData.number}</h1>
        <div class="invoice-details">
          <p><strong>Date:</strong> ${new Date(invoiceData.date).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
          <p>
            <span class="status-badge status-${invoiceData.status}">
              ${invoiceData.status.toUpperCase()}
            </span>
            ${invoiceData.contractStatus === 'accepted' ? 
              `<span class="status-badge contract-accepted">Contract Accepted</span>` : ''}
          </p>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="client-details">
        <h3>INVOICE FOR</h3>
        <p><strong>${invoiceData.client.name}</strong></p>
        ${invoiceData.client.email ? `<p>Email: ${invoiceData.client.email}</p>` : ''}
        ${invoiceData.client.phone ? `<p>Phone: ${invoiceData.client.phone}</p>` : ''}
        ${invoiceData.client.address ? `<p>Address: ${invoiceData.client.address}</p>` : ''}
      </div>
      
      ${invoiceData.job ? 
        `<div class="job-details">
          <h3>JOB DETAILS</h3>
          <p><strong>${invoiceData.job.title}</strong></p>
          ${invoiceData.job.date ? `<p>Date: ${new Date(invoiceData.job.date).toLocaleDateString()}</p>` : ''}
          ${invoiceData.job.description ? `<p>${invoiceData.job.description}</p>` : ''}
        </div>` : ''}
    </div>

    <div class="tabs">
      <div class="tab active" onclick="switchTab('invoice')">Invoice Details</div>
      <div class="tab" onclick="switchTab('contract')">Contract Terms</div>
    </div>

    <div id="invoice-tab" class="tab-content active">
      <table>
        <thead>
          <tr>
            <th class="item-description">Description</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map(item => `
            <tr>
              <td class="item-description">${item.description || 'Product/Service'}</td>
              <td>${item.quantity}</td>
              <td>$${item.rate.toFixed(2)}</td>
              <td>$${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3">Total</td>
            <td>$${invoiceData.amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      ${invoiceData.notes ? 
        `<div class="notes">
          <h3>Notes</h3>
          <div>${invoiceData.notes}</div>
        </div>` : ''}

      ${invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0 ? 
        `<div class="payment-schedule">
          <h3>Payment Schedule</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Percentage</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.paymentSchedules.map(schedule => `
                <tr>
                  <td>${schedule.description || ''}</td>
                  <td>${new Date(schedule.dueDate).toLocaleDateString()}</td>
                  <td>${schedule.status.toUpperCase()}</td>
                  <td>${schedule.percentage}%</td>
                  <td>$${schedule.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : 
        `<div class="payment-schedule">
          <h3>Payment</h3>
          <p>Full payment of $${invoiceData.amount.toFixed(2)} due on ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
        </div>`
      }
    </div>

    <div id="contract-tab" class="tab-content">
      ${invoiceData.contractTerms ? 
        `<div class="contract-terms">
          <h3>Contract Terms</h3>
          <div>${invoiceData.contractTerms}</div>
        </div>` : 
        `<div class="contract-terms">
          <p>No contract terms provided.</p>
        </div>`
      }
    </div>
  </div>

  <script>
    function switchTab(tabName) {
      // Hide all tab contents
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Deactivate all tabs
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Activate the selected tab and content
      document.getElementById(tabName + '-tab').classList.add('active');
      document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
    }
  </script>
</body>
</html>
  `;

  return html;
}
