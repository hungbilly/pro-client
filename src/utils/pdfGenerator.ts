
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice, Client, Job, CompanyClientView, PaymentSchedule } from '@/types';
import { formatCurrency } from '@/lib/utils';

/**
 * Generate a PDF from the provided invoice data
 */
export async function generateInvoicePdf(
  invoice: Invoice, 
  client: Client, 
  job: Job | null, 
  company: any, 
  clientViewCompany?: CompanyClientView | null,
  debugMode: boolean = false
): Promise<Blob> {
  // Create HTML content for the invoice
  const htmlContent = createInvoiceHtml(invoice, client, job, company, clientViewCompany, debugMode);
  
  // Create a container to render the HTML
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px'; // PDF width
  document.body.appendChild(container);
  
  try {
    // Create a PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    
    // Generate canvas from the HTML
    const canvas = await html2canvas(container, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Enable cross-origin images
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Add the canvas as an image to the PDF
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    // Add image with margins (20 points on each side)
    const margin = 20;
    const printWidth = pdfWidth - (margin * 2);
    const printHeight = (imgProps.height * printWidth) / imgProps.width;
    
    // Multiple pages logic for long content
    let heightLeft = printHeight;
    let position = margin;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, printWidth, printHeight);
    heightLeft -= pdf.internal.pageSize.getHeight() - 2 * margin;
    
    // Add new pages if content exceeds page height
    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (printHeight - heightLeft);
      pdf.addImage(imgData, 'PNG', margin, position, printWidth, printHeight);
      heightLeft -= pdf.internal.pageSize.getHeight() - 2 * margin;
    }
    
    // Return as blob
    return pdf.output('blob');
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Upload PDF to Supabase storage and update invoice record
 * Returns the URL if successful, null if there's an error (to allow fallback to direct download)
 */
export async function uploadInvoicePdf(
  invoiceId: string, 
  pdfBlob: Blob, 
  invoiceNumber: string,
  supabase: any
): Promise<string | null> {
  try {
    // Create a timestamp
    const timestamp = new Date().getTime();
    const filename = `invoices/${invoiceId}/invoice-${invoiceNumber}-${timestamp}.pdf`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('public')
      .upload(filename, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return null; // Return null instead of throwing an error
    }
    
    // Get public URL
    const { data: publicUrlData } = await supabase
      .storage
      .from('public')
      .getPublicUrl(filename);
    
    const pdfUrl = publicUrlData.publicUrl;
    
    // Update invoice record with PDF URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoiceId);
    
    if (updateError) {
      console.error('Error updating invoice with PDF URL:', updateError);
      return null; // Return null instead of throwing an error
    }
    
    return pdfUrl;
  } catch (err) {
    console.error('Error in uploadInvoicePdf:', err);
    return null; // Return null to allow fallback
  }
}

/**
 * Create HTML content for the invoice
 */
function createInvoiceHtml(
  invoice: Invoice, 
  client: Client, 
  job: Job | null, 
  company: any,
  clientViewCompany?: CompanyClientView | null,
  debugMode: boolean = false
): string {
  // For client view, use clientViewCompany info instead of company info
  const displayCompany = clientViewCompany || company;
  const companyCurrency = displayCompany?.currency || company?.currency || "USD";
  
  // Helper function for currency formatting
  const formatAmount = (amount: number | null | undefined) => {
    if (typeof amount !== 'number') return '$0.00';
    return formatCurrency(amount, companyCurrency);
  };
  
  if (debugMode) {
    // Simplified debug HTML
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Debug Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .debug-info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          pre { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>Invoice Debug View</h1>
        <div class="debug-info">
          <h2>Debug Information</h2>
          <pre>${JSON.stringify({
            invoiceId: invoice.id,
            companyId: invoice.companyId,
            companyName: company?.name,
            companyLogo: displayCompany?.logo_url,
            hasPaymentMethods: !!clientViewCompany?.payment_methods,
            paymentMethodsLength: clientViewCompany?.payment_methods?.length || 0
          }, null, 2)}</pre>
        </div>
        
        <h2>Company Information</h2>
        <div>
          ${displayCompany?.logo_url ? `<img src="${displayCompany.logo_url}" alt="Company Logo" style="max-height: 100px;">` : 'No logo available'}
          <p><strong>Name:</strong> ${company?.name || 'Not available'}</p>
          <p><strong>Email:</strong> ${company?.email || 'Not available'}</p>
          <p><strong>Phone:</strong> ${company?.phone || 'Not available'}</p>
          <p><strong>Address:</strong> ${company?.address || 'Not available'}</p>
        </div>
        
        ${clientViewCompany?.payment_methods ? `
          <h2>Payment Methods</h2>
          <div style="white-space: pre-line; border: 1px solid #ddd; padding: 10px; background: #fff;">
            ${clientViewCompany.payment_methods}
          </div>
        ` : '<p>No payment methods defined</p>'}
      </body>
      </html>
    `;
  }
  
  // Full invoice HTML template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.number}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 40px;
          color: #333;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .company-logo {
          max-width: 200px;
          max-height: 80px;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .invoice-details {
          margin-bottom: 30px;
        }
        .invoice-details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .invoice-details-column {
          flex: 1;
        }
        .label {
          font-weight: bold;
          margin-bottom: 5px;
          color: #666;
        }
        .value {
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .amount-column {
          text-align: right;
        }
        .total-row {
          font-weight: bold;
        }
        .notes {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .contract-terms {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .payment-schedule {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .payment-methods {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          white-space: pre-line;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-draft {
          background-color: #f2f2f2;
          color: #666;
        }
        .status-sent {
          background-color: #e3f2fd;
          color: #1976d2;
        }
        .status-accepted {
          background-color: #e8f5e9;
          color: #388e3c;
        }
        .status-paid {
          background-color: #f3e5f5;
          color: #7b1fa2;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div>
            ${displayCompany?.logo_url ? `<img src="${displayCompany.logo_url}" alt="Company Logo" class="company-logo">` : ''}
            <div style="margin-top: 10px;">
              <div style="font-weight: bold;">${company?.name || 'Company'}</div>
              ${company?.email ? `<div>${company.email}</div>` : ''}
              ${company?.phone ? `<div>${company.phone}</div>` : ''}
              ${company?.address ? `<div>${company.address}</div>` : ''}
            </div>
          </div>
          <div>
            <div class="invoice-title">INVOICE #${invoice.number}</div>
            <div>Date: ${new Date(invoice.date).toLocaleDateString()}</div>
            <div>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</div>
            <div style="margin-top: 10px;">
              <span class="status-badge status-${invoice.status.toLowerCase()}">
                ${invoice.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div class="invoice-details-row">
          <div class="invoice-details-column">
            <div class="label">BILL TO</div>
            <div class="value">
              <div style="font-weight: bold;">${client?.name || 'Client'}</div>
              ${client?.email ? `<div>${client.email}</div>` : ''}
              ${client?.phone ? `<div>${client.phone}</div>` : ''}
              ${client?.address ? `<div>${client.address}</div>` : ''}
            </div>
          </div>
          <div class="invoice-details-column">
            ${job?.title ? `
              <div class="label">PROJECT</div>
              <div class="value">${job.title}</div>
            ` : ''}
            ${job?.date ? `
              <div class="label">JOB DATE</div>
              <div class="value">${job.date}</div>
            ` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th class="amount-column">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items && invoice.items.map(item => {
              return `
                <tr>
                  <td>${item.name || 'Item'}</td>
                  <td>${item.description || ''}</td>
                  <td>${item.quantity || 1}</td>
                  <td>${formatAmount(item.rate)}</td>
                  <td class="amount-column">${formatAmount(item.amount)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">Total</td>
              <td class="amount-column">${formatAmount(invoice.amount)}</td>
            </tr>
          </tbody>
        </table>

        ${invoice.notes ? `
          <div class="notes">
            <div class="label">NOTES</div>
            <div>${invoice.notes}</div>
          </div>
        ` : ''}
        
        ${invoice.paymentSchedules && invoice.paymentSchedules.length > 0 ? `
          <div class="payment-schedule">
            <div class="label">PAYMENT SCHEDULE</div>
            <table>
              <thead>
                <tr>
                  <th>Due Date</th>
                  <th>Description</th>
                  <th class="amount-column">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.paymentSchedules.map(schedule => `
                  <tr>
                    <td>${new Date(schedule.dueDate).toLocaleDateString()}</td>
                    <td>${schedule.description || 'Payment'}</td>
                    <td class="amount-column">${formatAmount(schedule.amount)}</td>
                    <td>${schedule.status.toUpperCase()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${clientViewCompany?.payment_methods ? `
          <div class="payment-methods">
            <div class="label">PAYMENT METHODS</div>
            <div>${clientViewCompany.payment_methods}</div>
          </div>
        ` : ''}
        
        ${invoice.contractTerms ? `
          <div class="contract-terms">
            <div class="label">CONTRACT TERMS</div>
            <div>${invoice.contractTerms}</div>
          </div>
        ` : ''}

        <div class="footer">
          Thank you for your business!
        </div>
      </div>
    </body>
    </html>
  `;
}
