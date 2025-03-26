
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import jspdf from 'https://esm.sh/jspdf@2.5.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import autoTable from 'https://esm.sh/jspdf-autotable@3.8.0';

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
    // Initialize PDF document with A4 paper size
    const doc = new jspdf({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    let y = margin;

    // Function to add page footer
    const addPageFooter = () => {
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        // Left: Generated on date
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
        // Right: Invoice accepted | Contract terms accepted
        const statusText = `${invoiceData.status === 'accepted' ? 'Invoice accepted' : 'Invoice not accepted'} | ${invoiceData.contractStatus === 'accepted' ? 'Contract terms accepted' : 'Contract terms not accepted'}`;
        doc.text(statusText, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
    };
    
    // HEADER SECTION
    // Add company name (no logo in the example, but code supports it)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceData.company.name.toUpperCase(), margin, y);

    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const companyInfo = [];
    if (invoiceData.company.address) companyInfo.push(invoiceData.company.address);
    if (invoiceData.company.phone) companyInfo.push(`Phone: ${invoiceData.company.phone}`);
    if (invoiceData.company.website) companyInfo.push(`Website: ${invoiceData.company.website}`);
    
    companyInfo.forEach(info => {
      doc.text(info, margin, y);
      y += 5;
    });

    // Add invoice details to top right
    const invoiceDetailsX = pageWidth - margin - 50;
    let invoiceDetailsY = margin;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoiceData.number}`, invoiceDetailsX, invoiceDetailsY, { align: 'left' });
    invoiceDetailsY += 5;
    doc.text(`Invoice Date: ${new Date(invoiceData.date).toLocaleDateString()}`, invoiceDetailsX, invoiceDetailsY, { align: 'left' });
    invoiceDetailsY += 5;
    doc.text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, invoiceDetailsX, invoiceDetailsY, { align: 'left' });
    invoiceDetailsY += 5;
    doc.text(`Status: ${invoiceData.status.toUpperCase()}`, invoiceDetailsX, invoiceDetailsY, { align: 'left' });
    
    // Move past the header section
    y += 10;
    
    // INVOICE TITLE SECTION
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', margin, y);
    
    // Add a separator line
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 5, pageWidth - margin, y + 5);
    
    y += 15;
    
    // BILL TO & JOB SECTION (2-column layout)
    // Bill To on left
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', margin, y);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.client.name, margin, y + 6);
    
    let clientY = y + 12;
    if (invoiceData.client.email) {
      doc.text(`Email: ${invoiceData.client.email}`, margin, clientY);
      clientY += 5;
    }
    if (invoiceData.client.phone) {
      doc.text(`Phone: ${invoiceData.client.phone}`, margin, clientY);
      clientY += 5;
    }
    if (invoiceData.client.address) {
      doc.text(`Address: ${invoiceData.client.address}`, margin, clientY);
    }
    
    // Job details on right
    const jobDetailsX = pageWidth / 2;
    let jobDetailsY = y;
    
    if (invoiceData.job) {
      doc.setFont('helvetica', 'bold');
      doc.text('JOB:', jobDetailsX, jobDetailsY);
      jobDetailsY += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.text(invoiceData.job.title, jobDetailsX, jobDetailsY);
      jobDetailsY += 5;
      
      if (invoiceData.job.date) {
        doc.text(`Job Date: ${new Date(invoiceData.job.date).toLocaleDateString()}`, jobDetailsX, jobDetailsY);
        jobDetailsY += 5;
      }
      if (invoiceData.job.makeup) {
        doc.text(`makeup: ${invoiceData.job.makeup}`, jobDetailsX, jobDetailsY);
      }
    }
    
    y += 35;
    
    // LINE ITEMS SECTION
    if (invoiceData.items && invoiceData.items.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE ITEMS', margin, y);
      
      y += 8;
      
      // Use autotable for invoice items
      doc.setFontSize(9);
      
      // Define table header and rows
      const tableHeaders = [
        { header: 'Package/Service', dataKey: 'name' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Qty', dataKey: 'quantity' },
        { header: 'Rate', dataKey: 'rate' },
        { header: 'Amount', dataKey: 'amount' }
      ];
      
      const tableData = invoiceData.items.map(item => {
        return {
          name: item.name || 'Product/Service',
          description: stripHtml(item.description || ''),
          quantity: item.quantity.toString(),
          rate: `$${item.rate.toFixed(2)}`,
          amount: `$${item.amount.toFixed(2)}`
        };
      });
      
      // @ts-ignore - using autotable plugin
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
          fontStyle: 'bold' 
        },
        bodyStyles: { 
          fontSize: 9,
          lineColor: [220, 220, 220],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 35 },  // Package/Service
          1: { cellWidth: 'auto' },  // Description
          2: { cellWidth: 15, halign: 'center' },  // Qty
          3: { cellWidth: 25, halign: 'right' },  // Rate
          4: { cellWidth: 25, halign: 'right' }   // Amount
        },
        theme: 'grid',
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
        },
        didDrawPage: (data: any) => {
          // This is needed to track the current y position after drawing the table
          y = data.cursor.y + 5;
        }
      });
      
      // Add total after table
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', pageWidth - margin - 35, y);
      doc.text(`$${invoiceData.amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      
      y += 15;
    }
    
    // PAYMENT SCHEDULE SECTION
    if (invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0) {
      // Check if we need to add a new page
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT SCHEDULE', margin, y);
      
      y += 8;
      
      // Use autotable for payment schedule
      doc.setFontSize(9);
      
      const paymentHeaders = [
        { header: 'Description', dataKey: 'description' },
        { header: 'Due Date', dataKey: 'dueDate' },
        { header: 'Percentage', dataKey: 'percentage' },
        { header: 'Amount', dataKey: 'amount' },
        { header: 'Status', dataKey: 'status' }
      ];
      
      const paymentData = invoiceData.paymentSchedules.map(schedule => {
        return {
          description: schedule.description || '',
          dueDate: new Date(schedule.dueDate).toLocaleDateString(),
          percentage: schedule.percentage ? `${schedule.percentage}%` : 'N/A',
          amount: `$${schedule.amount.toFixed(2)}`,
          status: schedule.status.toUpperCase()
        };
      });
      
      // @ts-ignore - using autotable plugin
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
          fontStyle: 'bold' 
        },
        bodyStyles: { 
          fontSize: 9,
          lineColor: [220, 220, 220],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 'auto' },  // Description
          1: { cellWidth: 30 },      // Due Date
          2: { cellWidth: 25, halign: 'center' },  // Percentage
          3: { cellWidth: 30, halign: 'right' },   // Amount
          4: { cellWidth: 30, halign: 'center' }   // Status
        },
        theme: 'grid',
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
        },
        didDrawPage: (data: any) => {
          // This is needed to track the current y position after drawing the table
          y = data.cursor.y + 10;
        }
      });
    }
    
    // Add notes if available
    if (invoiceData.notes) {
      // Check if we need a new page
      if (y > pageHeight - 70) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES', margin, y);
      
      y += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const notesY = addWrappedText(doc, invoiceData.notes, margin, y, contentWidth);
      y = notesY + 15;
    }
    
    // CONTRACT TERMS SECTION - Always start on a new page
    if (invoiceData.contractTerms) {
      console.log('Adding contract terms to PDF');
      
      // Always start contract terms on a new page
      doc.addPage();
      y = margin;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRACT TERMS', margin, y);
      
      y += 10;
      
      // Split contract terms into paragraphs and detect headings
      const paragraphs = invoiceData.contractTerms.split('\n\n');
      doc.setFontSize(9);
      
      paragraphs.forEach(paragraph => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
        
        // Check if the paragraph is a heading (e.g., all caps or short line)
        const trimmedParagraph = paragraph.trim();
        const isHeading = trimmedParagraph.length < 50 && trimmedParagraph === trimmedParagraph.toUpperCase();
        
        if (isHeading) {
          doc.setFont('helvetica', 'bold');
          doc.text(trimmedParagraph, margin, y);
          y += 7;
        } else {
          doc.setFont('helvetica', 'normal');
          const textY = addWrappedText(doc, paragraph, margin, y, contentWidth);
          y = textY + 5;
        }
      });
    }
    
    // Add page footer with status information
    addPageFooter();
    
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
