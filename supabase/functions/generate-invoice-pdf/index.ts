
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
    // Initialize PDF document with a4 paper size
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
    
    // Add header with company information and invoice details
    if (invoiceData.company.logoUrl) {
      try {
        const response = await fetch(invoiceData.company.logoUrl);
        const blob = await response.blob();
        const logo = await blobToBase64(blob);
        
        // Calculate logo dimensions (max height 20mm, maintain aspect ratio)
        const maxLogoHeight = 20;
        const imgProps = doc.getImageProperties(logo);
        const aspectRatio = imgProps.width / imgProps.height;
        const logoHeight = Math.min(maxLogoHeight, imgProps.height);
        const logoWidth = logoHeight * aspectRatio;
        
        // Add logo
        doc.addImage(logo, 'PNG', margin, y, logoWidth, logoHeight);
        y += logoHeight + 5;
      } catch (logoError) {
        console.error('Error adding logo:', logoError);
        // Continue without logo if there's an error
        y += 5;
      }
    } else {
      // Add company name if no logo
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(invoiceData.company.name, margin, y + 8);
      y += 15;
    }
    
    // Company details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const companyInfo = [];
    if (invoiceData.company.address) companyInfo.push(invoiceData.company.address);
    if (invoiceData.company.email) companyInfo.push(`Email: ${invoiceData.company.email}`);
    if (invoiceData.company.phone) companyInfo.push(`Phone: ${invoiceData.company.phone}`);
    if (invoiceData.company.website) companyInfo.push(`Website: ${invoiceData.company.website}`);
    
    companyInfo.forEach(info => {
      doc.text(info, margin, y);
      y += 4;
    });
    
    // Invoice header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - margin - 30, margin);
    
    doc.setFontSize(11);
    doc.text(`# ${invoiceData.number}`, pageWidth - margin - 30, margin + 7);
    
    // Add invoice details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const infoX = pageWidth - margin - 40;
    const infoLabelX = infoX - 25;
    
    let infoY = margin + 15;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date:', infoLabelX, infoY);
    infoY += 5;
    doc.text('Due Date:', infoLabelX, infoY);
    infoY += 5;
    doc.text('Status:', infoLabelX, infoY);
    
    doc.setFont('helvetica', 'normal');
    
    infoY = margin + 15;
    doc.text(new Date(invoiceData.date).toLocaleDateString(), infoX, infoY);
    infoY += 5;
    doc.text(new Date(invoiceData.dueDate).toLocaleDateString(), infoX, infoY);
    infoY += 5;
    doc.text(invoiceData.status.toUpperCase(), infoX, infoY);
    
    y += 10;
    
    // Client and billing info section
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');
    
    // Client info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', margin + 5, y + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.client.name, margin + 5, y + 14);
    
    let clientY = y + 20;
    if (invoiceData.client.email) {
      doc.text(`Email: ${invoiceData.client.email}`, margin + 5, clientY);
      clientY += 5;
    }
    if (invoiceData.client.phone) {
      doc.text(`Phone: ${invoiceData.client.phone}`, margin + 5, clientY);
      clientY += 5;
    }
    if (invoiceData.client.address) {
      doc.text(`Address: ${invoiceData.client.address}`, margin + 5, clientY);
    }
    
    // Job info if available
    if (invoiceData.job) {
      doc.setFont('helvetica', 'bold');
      doc.text('JOB:', pageWidth / 2, y + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.text(invoiceData.job.title, pageWidth / 2, y + 14);
      
      if (invoiceData.job.date) {
        doc.text(`Job Date: ${invoiceData.job.date}`, pageWidth / 2, y + 20);
      }
      
      if (invoiceData.job.description) {
        const desc = doc.splitTextToSize(
          stripHtml(invoiceData.job.description), 
          contentWidth / 2 - 10
        );
        if (desc.length > 0) {
          doc.text(desc.slice(0, 2), pageWidth / 2, y + 26);
        }
      }
    }
    
    y += 40;
    
    // Invoice items table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE ITEMS', margin, y);
    
    y += 8;
    
    if (invoiceData.items && invoiceData.items.length > 0) {
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
      
      const startY = y;
      
      // @ts-ignore - using autotable plugin
      autoTable(doc, {
        head: [tableHeaders.map(h => h.header)],
        body: tableData.map(row => 
          tableHeaders.map(h => row[h.dataKey as keyof typeof row])
        ),
        startY: startY,
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
      doc.text('Total:', pageWidth - margin - 35, y);
      doc.text(`$${invoiceData.amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      
      y += 10;
    } else {
      // If no items, just say so
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('No items in this invoice.', margin, y);
      y += 10;
    }
    
    // Payment schedule section
    if (invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0) {
      y += 5;
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
          percentage: `${schedule.percentage}%`,
          amount: `$${schedule.amount.toFixed(2)}`,
          status: schedule.status.toUpperCase()
        };
      });
      
      const paymentStartY = y;
      
      // @ts-ignore - using autotable plugin
      autoTable(doc, {
        head: [paymentHeaders.map(h => h.header)],
        body: paymentData.map(row => 
          paymentHeaders.map(h => row[h.dataKey as keyof typeof row])
        ),
        startY: paymentStartY,
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
          1: { cellWidth: 25 },      // Due Date
          2: { cellWidth: 25, halign: 'center' },  // Percentage
          3: { cellWidth: 25, halign: 'right' },   // Amount
          4: { cellWidth: 25, halign: 'center' }   // Status
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
    
    // Add contract terms if available
    if (invoiceData.contractTerms) {
      console.log('Adding contract terms to PDF');
      
      // Check if we need a new page
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRACT TERMS', margin, y);
      
      y += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const contractY = addWrappedText(doc, invoiceData.contractTerms, margin, y, contentWidth);
      y = contractY + 10;
    }
    
    // Footer
    const footerY = pageHeight - 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY);
    
    // Add status information
    let statusText = '';
    if (invoiceData.status === 'accepted') {
      statusText = 'Invoice accepted';
    }
    if (invoiceData.contractStatus === 'accepted') {
      statusText += statusText ? ' | Contract terms accepted' : 'Contract terms accepted';
    }
    
    if (statusText) {
      doc.text(statusText, pageWidth - margin, footerY, { align: 'right' });
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
