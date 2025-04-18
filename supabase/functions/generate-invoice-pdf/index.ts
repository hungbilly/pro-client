import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import jspdf from 'https://esm.sh/jspdf@2.5.1';
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

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

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

    console.log('Fetched invoice contract terms:', {
      hasContractTerms: !!invoice.contract_terms,
      contractTermsLength: invoice.contract_terms?.length || 0,
      preview: invoice.contract_terms?.substring(0, 100)
    });

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    const { data: company, error: companyError } = await supabase
      .from('company_clientview')
      .select('*')
      .eq('company_id', invoice.company_id)
      .single();
    
    console.log('Invoice company_id:', invoice.company_id);
    console.log('Fetched company data from company_clientview:', company);
    if (companyError) {
      console.error('Error fetching company data from company_clientview:', companyError);
    }

    let job = null;
    if (invoice.job_id) {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', invoice.job_id)
        .single();
      job = jobData;
    }

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

    console.log('Uploading PDF for invoice:', invoiceId);
    
    const pdfData = await generatePDF(formattedInvoice);

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

    const { data: publicUrlData } = supabase
      .storage
      .from('invoice-pdfs')
      .getPublicUrl(filePath);

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
    const doc = new jspdf({
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
      const totalPages = doc.internal.getNumberOfPages();
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
        if (!response.ok) throw new Error(`Failed to fetch logo: ${response.statusText}`);
      
        const blob = await response.blob();
        const logo = await blobToBase64(blob);
      
        const maxLogoHeight = 40;
        const imgProps = doc.getImageProperties(logo);
      
        const aspectRatio = imgProps.width / imgProps.height;
        const logoHeight = Math.min(maxLogoHeight, imgProps.height);
        const logoWidth = logoHeight * aspectRatio;
      
        // Adjust logo X position to move more to the left
        const logoX = margin + (rightColumnX - margin - logoWidth) / 4;  // Moved more to the left
    
        doc.addImage(logo, 'PNG', logoX, y, logoWidth, logoHeight);
        leftColumnY += logoHeight + 10; // Update left column position after logo
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
    return doc.output('arraybuffer');
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw new Error('Failed to generate PDF');
  }
}
