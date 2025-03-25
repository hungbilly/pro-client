
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId } = await req.json();
    
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'Invoice ID is required' }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    console.log(`Generating static HTML for invoice: ${invoiceId}`);
    
    // Initialize Supabase client with ENV vars
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch invoice data with all related information
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
      console.error(`Error fetching invoice:`, invoiceError);
      return new Response(JSON.stringify({ error: 'Invoice not found' }), { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();
    
    if (clientError || !client) {
      console.error(`Error fetching client:`, clientError);
      return new Response(JSON.stringify({ error: 'Client not found' }), { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    // Fetch company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', invoice.company_id)
      .single();
    
    if (companyError) {
      console.error(`Error fetching company:`, companyError);
      // Continue without company data
    }
    
    // Fetch job data if available
    let job = null;
    if (invoice.job_id) {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', invoice.job_id)
        .single();
      
      if (!jobError && jobData) {
        job = jobData;
      } else {
        console.error(`Error fetching job:`, jobError);
        // Continue without job data
      }
    }
    
    // Generate HTML content
    const htmlContent = generateInvoiceHtml(invoice, client, company, job);
    
    // Check if there's already a static version for this invoice
    const { data: existingStatic } = await supabase
      .from('clientview_invoice')
      .select('id')
      .eq('invoice_id', invoiceId)
      .maybeSingle();
    
    let result;
    
    if (existingStatic) {
      // Update existing static invoice
      const { data, error } = await supabase
        .from('clientview_invoice')
        .update({
          html_content: htmlContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingStatic.id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating static invoice:`, error);
        throw error;
      }
      
      result = data;
      console.log(`Updated static HTML for invoice: ${invoiceId}`);
    } else {
      // Create new static invoice
      const { data, error } = await supabase
        .from('clientview_invoice')
        .insert({
          invoice_id: invoiceId,
          html_content: htmlContent,
          view_link: invoice.view_link
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating static invoice:`, error);
        throw error;
      }
      
      result = data;
      console.log(`Created static HTML for invoice: ${invoiceId}`);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      viewLink: result.view_link,
      message: 'Static invoice HTML generated successfully' 
    }), { 
      headers: corsHeaders 
    });
  } catch (error) {
    console.error(`Error in generate-static-invoice:`, error);
    return new Response(JSON.stringify({ 
      error: `Server Error: ${error.message}` 
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});

// Helper function to format currency
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Helper function to generate the invoice HTML
function generateInvoiceHtml(invoice: any, client: any, company: any, job: any) {
  // Format invoice date and due date
  const invoiceDate = new Date(invoice.date).toLocaleDateString();
  const dueDate = new Date(invoice.due_date).toLocaleDateString();
  
  // Calculate total amount
  const totalAmount = formatCurrency(invoice.amount);
  
  // Determine status colors and texts
  const statusText = invoice.status.toUpperCase();
  let statusColorClass = '';
  
  switch (invoice.status) {
    case 'draft':
      statusColorClass = 'bg-gray-200 text-gray-800';
      break;
    case 'sent':
      statusColorClass = 'bg-blue-200 text-blue-800';
      break;
    case 'accepted':
      statusColorClass = 'bg-green-200 text-green-800';
      break;
    case 'paid':
      statusColorClass = 'bg-purple-200 text-purple-800';
      break;
    default:
      statusColorClass = 'bg-gray-200 text-gray-800';
  }
  
  const contractStatusText = invoice.contract_status?.toUpperCase() || 'PENDING';
  const contractStatusColorClass = invoice.contract_status === 'accepted' 
    ? 'bg-green-200 text-green-800' 
    : 'bg-yellow-200 text-yellow-800';
  
  // Generate invoice items HTML
  let itemsHtml = '';
  if (invoice.invoice_items && invoice.invoice_items.length > 0) {
    itemsHtml = invoice.invoice_items.map((item: any) => `
      <div class="mb-4 pb-4 border-b last:mb-0 last:pb-0 last:border-b-0">
        <div class="md:flex md:justify-between md:items-start">
          <div class="md:flex-1">
            <h5 class="font-medium">${item.name || 'Unnamed Package'}</h5>
          </div>
          <div class="md:flex-1 md:pr-4">
            ${item.description ? `<div class="mt-2 text-sm">${item.description}</div>` : ''}
          </div>
          <div class="mt-2 md:mt-0 flex flex-col md:flex-row md:items-center md:space-x-6 md:min-w-[260px] md:justify-end">
            <div class="text-sm text-muted-foreground md:text-right w-16">
              <span class="md:hidden">Quantity: </span>
              <span>${item.quantity}</span>
            </div>
            <div class="text-sm text-muted-foreground md:text-right w-24">
              <span class="md:hidden">Unit Price: </span>
              <span>${formatCurrency(item.rate)}</span>
            </div>
            <div class="font-medium md:text-right w-24">
              <span class="md:hidden">Total: </span>
              <span>${formatCurrency(item.amount)}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } else {
    itemsHtml = '<p class="text-gray-500">No items in this invoice.</p>';
  }
  
  // Generate payment schedules HTML
  let schedulesHtml = '';
  if (invoice.payment_schedules && invoice.payment_schedules.length > 0) {
    schedulesHtml = `
      <table class="min-w-full divide-y divide-gray-200 border">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${invoice.payment_schedules.map((schedule: any) => {
            const scheduleAmount = (invoice.amount * schedule.percentage / 100).toFixed(2);
            const formattedAmount = formatCurrency(parseFloat(scheduleAmount));
            const scheduleDate = new Date(schedule.due_date).toLocaleDateString();
            
            let statusHtml = '';
            if (schedule.status === 'paid') {
              statusHtml = `<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Paid</span>`;
            } else if (schedule.status === 'unpaid') {
              statusHtml = `<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Unpaid</span>`;
            } else {
              statusHtml = `<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">Write-off</span>`;
            }
            
            return `
              <tr>
                <td class="px-4 py-3 whitespace-nowrap">${schedule.description || `Payment ${schedule.percentage}%`}</td>
                <td class="px-4 py-3 whitespace-nowrap">${scheduleDate}</td>
                <td class="px-4 py-3 whitespace-nowrap">${formattedAmount}</td>
                <td class="px-4 py-3 whitespace-nowrap">${statusHtml}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } else {
    schedulesHtml = `
      <div class="text-gray-500 border rounded-md p-4 bg-gray-50">
        Full payment of ${totalAmount} due on ${dueDate}
      </div>
    `;
  }
  
  // Build the full HTML
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${invoice.number}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          .no-print {
            display: none;
          }
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body class="bg-gray-100 min-h-screen">
      <div class="container mx-auto py-8 px-4">
        <div class="bg-white shadow-md rounded-lg overflow-hidden max-w-4xl mx-auto">
          <div class="p-6">
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold mb-2">Invoice #${invoice.number}</h1>
              <p class="text-gray-500">
                Please review the invoice${invoice.contractTerms ? ' and contract terms' : ''} below.
              </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              <!-- Company/Sender Info -->
              <div class="flex flex-col justify-between">
                <div class="flex items-start mb-6">
                  ${company?.logo_url ? `
                    <img src="${company.logo_url}" alt="${company.name} Logo" class="h-24 w-auto object-contain" />
                  ` : `
                    <div class="h-24 w-24 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  `}
                </div>
                
                <div>
                  <div class="text-sm text-gray-500">INVOICE</div>
                  <div class="text-2xl font-bold"># ${invoice.number}</div>
                  <div class="text-sm text-gray-500 mt-1">INVOICE ISSUE DATE</div>
                  <div class="text-sm">${invoiceDate}</div>
                  <div class="mt-1 flex items-center">
                    <span class="px-2 py-1 text-xs rounded-full ${statusColorClass}">
                      ${statusText}
                    </span>
                    ${invoice.contract_status === 'accepted' ? `
                      <span class="ml-2 px-2 py-1 text-xs rounded-full ${contractStatusColorClass} flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Contract Accepted
                      </span>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              <!-- Client Info -->
              <div class="space-y-4">
                <div>
                  <h4 class="text-sm font-medium text-gray-500 mb-1">FROM</h4>
                  <div class="font-medium">${company?.name || 'Company'}</div>
                  ${company?.email ? `<div class="text-sm">${company.email}</div>` : ''}
                  ${company?.phone ? `<div class="text-sm">${company.phone}</div>` : ''}
                  ${company?.address ? `<div class="text-sm">${company.address}</div>` : ''}
                </div>
                
                <div>
                  <h4 class="text-sm font-medium text-gray-500 mb-1">INVOICE FOR</h4>
                  ${job ? `<div class="font-medium">${job.title}</div>` : ''}
                  <div class="text-sm font-medium mt-1">Client: ${client.name}</div>
                  <div class="text-sm grid grid-cols-1 gap-1 mt-1">
                    ${client.email ? `
                      <div class="flex items-center text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        ${client.email}
                      </div>
                    ` : ''}
                    ${client.phone ? `
                      <div class="flex items-center text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        ${client.phone}
                      </div>
                    ` : ''}
                    ${client.address ? `
                      <div class="flex items-center text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        ${client.address}
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>
            
            <hr class="my-6">
            
            <!-- Invoice Details -->
            <div class="mb-8">
              <div class="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h4 class="text-lg font-semibold">Products / Packages</h4>
              </div>
              
              <div class="border rounded-md p-4 bg-gray-50">
                <div class="hidden md:flex justify-between mb-3 text-sm font-medium text-gray-500 border-b pb-2">
                  <div class="flex-1">
                    <div class="mb-1">Package Name</div>
                  </div>
                  <div class="flex-1 pr-4">Description</div>
                  <div class="flex items-center space-x-6 min-w-[260px] justify-end">
                    <div class="text-right w-16">Quantity</div>
                    <div class="text-right w-24">Unit Price</div>
                    <div class="text-right w-24">Amount</div>
                  </div>
                </div>
                
                ${itemsHtml}
                
                <div class="mt-4 pt-4 border-t">
                  <div class="flex justify-between font-medium">
                    <span>Total</span>
                    <span>${totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Notes -->
            ${invoice.notes ? `
              <div class="mb-8">
                <h4 class="text-lg font-semibold mb-2">Notes</h4>
                <div class="border rounded-md p-4 bg-gray-50">
                  ${invoice.notes}
                </div>
              </div>
            ` : ''}
            
            <!-- Payment Schedule -->
            <div class="mb-8">
              <div class="flex items-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h4 class="text-lg font-semibold">Payment Schedule</h4>
              </div>
              
              ${schedulesHtml}
            </div>
            
            ${invoice.contractTerms ? `
              <!-- Contract Terms -->
              <div class="page-break mt-8">
                <div class="flex items-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 class="text-lg font-semibold">Contract Terms</h4>
                </div>
                
                <div class="border rounded-md p-4 bg-gray-50">
                  ${invoice.contractTerms}
                </div>
                
                ${invoice.contract_status === 'accepted' ? `
                  <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-green-800">
                      This contract has been accepted
                    </span>
                  </div>
                ` : ''}
              </div>
            ` : ''}
            
            <!-- Footer -->
            <div class="mt-8 pt-4 border-t text-center text-gray-500 text-sm">
              <p>This invoice was generated on ${new Date().toLocaleDateString()}</p>
              ${company?.name ? `<p>${company.name}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
