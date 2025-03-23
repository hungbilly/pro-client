
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import jspdf from 'https://esm.sh/jspdf@2.5.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

console.log('Function initialization - URL defined:', !!supabaseUrl, 'Key defined:', !!supabaseServiceKey);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FormattedInvoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: string;
  amount: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyLogoUrl?: string;
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  notes?: string;
  contractTerms?: string;
  viewLink: string;
}

async function fetchInvoiceData(invoiceId: string): Promise<FormattedInvoice | null> {
  console.log('Fetching invoice data for ID:', invoiceId);
  
  try {
    // Get invoice with items and payment schedules
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items(*),
        payment_schedules (
          id,
          due_date,
          percentage,
          description,
          status,
          payment_date
        )
      `)
      .eq('id', invoiceId)
      .single();
    
    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return null;
    }
    
    console.log('Invoice fetched successfully:', invoice.id);
    
    // Get client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();
    
    if (clientError || !client) {
      console.error('Error fetching client:', clientError);
      return null;
    }
    
    console.log('Client fetched successfully:', client.id);
    
    // Get company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', invoice.company_id)
      .single();
    
    if (companyError || !company) {
      console.error('Error fetching company:', companyError);
      return null;
    }
    
    console.log('Company fetched successfully:', company.id);
    
    // Format the data
    return {
      id: invoice.id,
      number: invoice.number,
      date: invoice.date,
      dueDate: invoice.due_date,
      status: invoice.status,
      amount: invoice.amount,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: client.address,
      companyName: company.name,
      companyEmail: company.email,
      companyPhone: company.phone,
      companyAddress: company.address,
      companyLogoUrl: company.logo_url,
      items: invoice.invoice_items.map((item: any) => ({
        description: item.description ? item.description.split('<')[0] : 'Product', // Strip HTML
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: item.amount || 0
      })),
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link || ''
    };
  } catch (err) {
    console.error('Error in fetchInvoiceData:', err);
    return null;
  }
}

async function generatePDF(invoiceData: FormattedInvoice): Promise<Uint8Array> {
  console.log('Generating PDF for invoice:', invoiceData.number);
  
  try {
    const doc = new jspdf({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Helper function to format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount);
    };
    
    // Set initial position
    let y = 20;
    
    // Add company info
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceData.companyName, 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (invoiceData.companyEmail) {
      doc.text(`Email: ${invoiceData.companyEmail}`, 20, y);
      y += 6;
    }
    if (invoiceData.companyPhone) {
      doc.text(`Phone: ${invoiceData.companyPhone}`, 20, y);
      y += 6;
    }
    if (invoiceData.companyAddress) {
      doc.text(`Address: ${invoiceData.companyAddress}`, 20, y);
      y += 10;
    }
    
    // Add invoice details
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: #${invoiceData.number}`, 20, y);
    y += 6;
    doc.text(`Date: ${new Date(invoiceData.date).toLocaleDateString()}`, 20, y);
    y += 6;
    doc.text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, 20, y);
    y += 6;
    doc.text(`Status: ${invoiceData.status.toUpperCase()}`, 20, y);
    y += 10;
    
    // Add client info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, y);
    y += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.clientName, 20, y);
    y += 6;
    if (invoiceData.clientEmail) {
      doc.text(`Email: ${invoiceData.clientEmail}`, 20, y);
      y += 6;
    }
    if (invoiceData.clientPhone) {
      doc.text(`Phone: ${invoiceData.clientPhone}`, 20, y);
      y += 6;
    }
    if (invoiceData.clientAddress) {
      doc.text(`Address: ${invoiceData.clientAddress}`, 20, y);
      y += 10;
    }
    
    // Add items
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Items', 20, y);
    y += 8;
    
    // Add table headers
    doc.setFontSize(10);
    doc.text('Description', 20, y);
    doc.text('Qty', 120, y);
    doc.text('Rate', 140, y);
    doc.text('Amount', 170, y);
    y += 4;
    
    // Add line
    doc.line(20, y, 190, y);
    y += 6;
    
    // Add items
    doc.setFont('helvetica', 'normal');
    if (invoiceData.items && invoiceData.items.length > 0) {
      invoiceData.items.forEach(item => {
        // Check if we need a new page
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(item.description || 'Product', 20, y, { maxWidth: 95 });
        doc.text(item.quantity.toString(), 120, y);
        doc.text(formatCurrency(item.rate), 140, y);
        doc.text(formatCurrency(item.amount), 170, y);
        y += 10;
      });
    } else {
      doc.text('No items', 20, y);
      y += 10;
    }
    
    // Add line
    doc.line(20, y, 190, y);
    y += 6;
    
    // Add total
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 140, y);
    doc.text(formatCurrency(invoiceData.amount), 170, y);
    y += 15;
    
    // Add notes if available
    if (invoiceData.notes) {
      // Check if we need a new page
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Strip HTML tags from notes
      const plainNotes = invoiceData.notes.replace(/<[^>]*>/g, '');
      doc.text(plainNotes, 20, y, { maxWidth: 170 });
      y += 15;
    }
    
    // Add contract terms if available
    if (invoiceData.contractTerms) {
      // Check if we need a new page
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Contract Terms', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Strip HTML tags from contract terms
      const plainTerms = invoiceData.contractTerms.replace(/<[^>]*>/g, '');
      doc.text(plainTerms, 20, y, { maxWidth: 170 });
    }
    
    // Add view link
    if (invoiceData.viewLink) {
      doc.setFontSize(8);
      doc.text(`View online: ${invoiceData.viewLink}`, 20, 285);
    }
    
    return doc.output('arraybuffer');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

async function uploadPDF(pdfBuffer: Uint8Array, invoiceId: string): Promise<string | null> {
  try {
    console.log('Uploading PDF for invoice:', invoiceId);
    
    const fileName = `invoices/${invoiceId}.pdf`;
    
    // Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return null;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'invoice-pdfs');
    
    if (!bucketExists) {
      console.error('Bucket invoice-pdfs does not exist');
      return null;
    }
    
    console.log('Uploading PDF to bucket: invoice-pdfs');
    
    const { data, error } = await supabase.storage
      .from('invoice-pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    
    if (error) {
      console.error('Error uploading PDF:', error);
      return null;
    }
    
    console.log('PDF uploaded successfully:', data?.path);
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('invoice-pdfs')
      .getPublicUrl(fileName);
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Failed to get public URL for PDF');
      return null;
    }
    
    console.log('PDF public URL:', publicUrlData.publicUrl);
    
    // Update invoice with PDF URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: publicUrlData.publicUrl })
      .eq('id', invoiceId);
    
    if (updateError) {
      console.error('Error updating invoice with PDF URL:', updateError);
      return null;
    }
    
    console.log('Invoice updated with PDF URL');
    
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Error in uploadPDF:', err);
    return null;
  }
}

serve(async (req) => {
  console.log('Received request:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders, 
      status: 204 
    });
  }
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Parsing request body');
    
    // Parse the request body
    const requestData = await req.json();
    const { invoiceId } = requestData;
    
    console.log('Request data:', { invoiceId });
    
    if (!invoiceId) {
      console.log('Missing invoiceId in request');
      return new Response(JSON.stringify({ error: 'Invoice ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Fetch the invoice data
    console.log('Fetching invoice data');
    const invoiceData = await fetchInvoiceData(invoiceId);
    
    if (!invoiceData) {
      console.log('Invoice not found');
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Generate the PDF
    console.log('Generating PDF');
    const pdfBuffer = await generatePDF(invoiceData);
    
    // Upload the PDF to Supabase Storage
    console.log('Uploading PDF');
    const pdfUrl = await uploadPDF(pdfBuffer, invoiceId);
    
    if (!pdfUrl) {
      console.log('Failed to upload PDF');
      return new Response(JSON.stringify({ error: 'Failed to upload PDF' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Return the PDF URL
    console.log('Successfully generated and uploaded PDF:', pdfUrl);
    return new Response(JSON.stringify({ pdfUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in generate-invoice-pdf function:', error);
    
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
