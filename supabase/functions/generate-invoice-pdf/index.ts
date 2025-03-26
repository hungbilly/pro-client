
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Import Chrome for Deno's built-in browser
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

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

    // Fetch the invoice data to construct the URL
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('view_link, contract_terms')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Found invoice with view link:', invoice.view_link);
    console.log('Contract terms length:', invoice.contract_terms?.length || 0);

    // Get the base URL from the request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    
    // Construct the client view URL - use the deployed URL or a fallback
    const viewLink = invoice.view_link.includes('/') ? invoice.view_link.split('/').pop() : invoice.view_link;
    const clientViewUrl = `${baseUrl}/invoice/${viewLink}`;
    console.log('Generated client view URL:', clientViewUrl);
    
    // First, use fetch to get the HTML content of the page
    console.log('Fetching HTML content first...');
    const response = await fetch(clientViewUrl);
    const htmlContent = await response.text();
    
    // Parse the HTML and check if it contains contract terms
    const parser = new DOMParser();
    const document = parser.parseFromString(htmlContent, 'text/html');
    const contractTermsContent = document?.querySelector('[data-testid="contract-tab"]');
    console.log('Contract terms found in HTML:', !!contractTermsContent);
    
    // Generate the PDF using Chrome browser
    console.log('Launching browser for PDF generation...');
    
    // Use the recommended approach for Deno Deploy
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: true,
    });
    
    try {
      console.log('Browser launched successfully');
      const page = await browser.newPage();
      console.log('New page created');

      // Set viewport to match A4 dimensions
      await page.setViewport({
        width: 794, // A4 width in pixels at 96 DPI (210mm)
        height: 1123, // A4 height in pixels at 96 DPI (297mm)
        deviceScaleFactor: 1,
      });
      console.log('Viewport set to A4 dimensions');

      // Navigate to the invoice URL
      console.log(`Navigating to: ${clientViewUrl}`);
      await page.goto(clientViewUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      console.log('Page loaded successfully');
      
      // Add a delay to ensure everything loads properly
      await page.waitForTimeout(2000);
      console.log('Additional wait time complete');
      
      // Extract and log the current page content for debugging
      const title = await page.title();
      console.log('Page title:', title);
      
      // Check if contract terms are present
      const contractTabExists = await page.evaluate(() => {
        const tabsList = document.querySelector('[data-testid="tabs-list"]');
        const contractTab = document.querySelector('[data-testid="contract-tab"]');
        const contractTrigger = document.querySelector('[value="contract"]');
        
        console.log('Tabs list exists:', !!tabsList);
        console.log('Contract tab exists:', !!contractTab);
        console.log('Contract trigger exists:', !!contractTrigger);
        
        return !!contractTab;
      });
      
      console.log('Contract tab exists in page:', contractTabExists);
      
      // Inject CSS to ensure all content is visible in the PDF
      await page.addStyleTag({
        content: `
          @media print {
            [data-testid="tabs-list"] { display: none !important; }
            [data-testid="invoice-tab"], 
            [data-testid="contract-tab"] { 
              display: block !important; 
              visibility: visible !important;
            }
            [data-testid="contract-tab"] { 
              page-break-before: always !important; 
              padding-top: 20px !important;
              margin-top: 0 !important;
            }
            .rich-text-editor { 
              display: block !important; 
              visibility: visible !important;
            }
            .rich-text-editor * { 
              display: block !important; 
              visibility: visible !important;
            }
            .no-print { display: none !important; }
          }
        `
      });
      console.log('Added print styles');
      
      // First make sure the invoice tab is visible
      await page.evaluate(() => {
        const invoiceTab = document.querySelector('[data-testid="invoice-tab"]');
        if (invoiceTab) {
          (invoiceTab as HTMLElement).style.display = 'block';
        }
      });
      
      // Force click the contract tab first to ensure it's loaded
      await page.evaluate(() => {
        const contractTrigger = document.querySelector('[value="contract"]');
        if (contractTrigger) {
          (contractTrigger as HTMLElement).click();
          console.log('Clicked contract tab trigger');
        }
      });
      
      // Wait for contract tab content to load
      await page.waitForTimeout(1000);
      
      // Now ensure both tabs are visible for print
      await page.evaluate(() => {
        // Hide the tab list
        const tabsList = document.querySelector('[data-testid="tabs-list"]');
        if (tabsList) {
          (tabsList as HTMLElement).style.display = 'none';
        }
        
        // Make invoice tab visible
        const invoiceTab = document.querySelector('[data-testid="invoice-tab"]');
        if (invoiceTab) {
          (invoiceTab as HTMLElement).style.display = 'block';
          (invoiceTab as HTMLElement).style.visibility = 'visible';
        }
        
        // Make contract tab visible with page break
        const contractTab = document.querySelector('[data-testid="contract-tab"]');
        if (contractTab) {
          (contractTab as HTMLElement).style.display = 'block';
          (contractTab as HTMLElement).style.visibility = 'visible';
          (contractTab as HTMLElement).style.pageBreakBefore = 'always';
        }
        
        // Ensure rich text editors are visible
        document.querySelectorAll('.rich-text-editor').forEach(editor => {
          (editor as HTMLElement).style.display = 'block';
          (editor as HTMLElement).style.visibility = 'visible';
        });
        
        // Hide elements with no-print class
        document.querySelectorAll('.no-print').forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });
      });
      
      console.log('DOM prepared for printing');
      
      // Verify contract content is visible before printing
      const contractContentVisible = await page.evaluate(() => {
        const contractTab = document.querySelector('[data-testid="contract-tab"]');
        if (!contractTab) return false;
        
        const style = window.getComputedStyle(contractTab as Element);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
        
        console.log('Contract tab computed style:', {
          display: style.display,
          visibility: style.visibility
        });
        
        const richTextEditor = contractTab.querySelector('.rich-text-editor');
        const hasContent = richTextEditor ? richTextEditor.textContent.trim().length > 0 : false;
        
        console.log('Rich text editor has content:', hasContent);
        
        return isVisible && hasContent;
      });
      
      console.log('Contract content is visible:', contractContentVisible);
      
      // Generate PDF
      console.log('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        preferCSSPageSize: true,
      });

      console.log('PDF generation complete. Size:', pdfBuffer.byteLength, 'bytes');
      
      // Upload PDF to Supabase Storage
      console.log('Uploading PDF to storage...');
      const filePath = `invoices/${invoiceId}.pdf`;
      const { error: uploadError } = await supabase
        .storage
        .from('invoice-pdfs')
        .upload(filePath, pdfBuffer, {
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

      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('invoice-pdfs')
        .getPublicUrl(filePath);

      console.log('PDF uploaded successfully, public URL:', publicUrlData.publicUrl);

      // Update invoice with PDF URL
      await supabase
        .from('invoices')
        .update({ pdf_url: publicUrlData.publicUrl })
        .eq('id', invoiceId);

      console.log('Invoice updated with PDF URL');

      return new Response(
        JSON.stringify({ pdfUrl: publicUrlData.publicUrl }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 }
      );
    } finally {
      // Ensure browser is closed even if an error occurs
      if (browser) {
        await browser.close();
        console.log('Browser closed');
      }
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message, stack: error.stack }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
