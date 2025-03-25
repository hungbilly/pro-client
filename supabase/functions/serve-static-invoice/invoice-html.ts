
// This is a copy of the necessary functions from src/lib/utils.ts
// We need to duplicate it here because Edge Functions don't have access to the frontend code

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function generateInvoiceHTML(invoice: any, client: any, company: any, job?: any): string {
  // Create a simple but professional HTML template for the invoice
  const statusColors: Record<string, string> = {
    draft: '#6c757d',
    sent: '#007bff',
    accepted: '#28a745',
    paid: '#6f42c1',
  };

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${invoice.number}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.5;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .logo-container {
          max-width: 200px;
          max-height: 80px;
        }
        .logo-container img {
          max-width: 100%;
          max-height: 100%;
        }
        .invoice-info {
          text-align: right;
        }
        .invoice-number {
          font-size: 24px;
          font-weight: bold;
        }
        .invoice-status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 14px;
          color: white;
          background-color: ${statusColors[invoice.status] || '#6c757d'};
        }
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .party {
          width: 48%;
        }
        h3 {
          color: #555;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .items {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items th, .items td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        .items th {
          background-color: #f8f9fa;
        }
        .amount-due {
          margin-top: 20px;
          text-align: right;
          font-size: 18px;
          font-weight: bold;
        }
        .notes {
          margin-top: 30px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
        }
        .contract {
          margin-top: 30px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 14px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div class="logo-container">
          ${company?.logo_url ? `<img src="${company.logo_url}" alt="${company.name} Logo">` : `<h2>${company?.name || 'Company'}</h2>`}
        </div>
        <div class="invoice-info">
          <div class="invoice-number">Invoice #${invoice.number}</div>
          <div>Date: ${new Date(invoice.date).toLocaleDateString()}</div>
          <div>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</div>
          <div>
            Status: <span class="invoice-status">${invoice.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party from">
          <h3>FROM</h3>
          <div>${company?.name || 'Company'}</div>
          ${company?.email ? `<div>${company.email}</div>` : ''}
          ${company?.phone ? `<div>${company.phone}</div>` : ''}
          ${company?.address ? `<div>${company.address}</div>` : ''}
        </div>
        <div class="party to">
          <h3>TO</h3>
          <div>${client?.name || 'Client'}</div>
          ${client?.email ? `<div>${client.email}</div>` : ''}
          ${client?.phone ? `<div>${client.phone}</div>` : ''}
          ${client?.address ? `<div>${client.address}</div>` : ''}
        </div>
      </div>

      ${job ? `
      <div class="job-info">
        <h3>JOB DETAILS</h3>
        <div>Job: ${job.title}</div>
        ${job.date ? `<div>Date: ${job.date}</div>` : ''}
        ${job.location ? `<div>Location: ${job.location}</div>` : ''}
      </div>
      ` : ''}

      <h3>INVOICE ITEMS</h3>
      <table class="items">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map((item: any) => `
            <tr>
              <td>
                <div><strong>${item.name || item.productName || 'Product'}</strong></div>
                <div>${item.description || ''}</div>
              </td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.rate)}</td>
              <td>${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="amount-due">
        Total Amount: ${formatCurrency(invoice.amount)}
      </div>

      ${invoice.notes ? `
      <div class="notes">
        <h3>NOTES</h3>
        ${invoice.notes}
      </div>
      ` : ''}

      ${invoice.contractTerms ? `
      <div class="contract">
        <h3>CONTRACT TERMS</h3>
        ${invoice.contractTerms}
      </div>
      ` : ''}

      <div class="footer">
        This invoice was generated on ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `;

  return html;
}
