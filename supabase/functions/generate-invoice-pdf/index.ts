
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

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
    const clientViewUrl = `${baseUrl}/invoice/${invoice.view_link}`;
    console.log('Generated client view URL:', clientViewUrl);

    // Launch puppeteer
    console.log('Launching puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    try {
      const page = await browser.newPage();

      // Set viewport to match A4 dimensions
      await page.setViewport({
        width: 794, // A4 width in pixels at 96 DPI (210mm)
        height: 1123, // A4 height in pixels at 96 DPI (297mm)
        deviceScaleFactor: 1,
      });

      console.log('Navigating to client view URL...');
      // Navigate to the client view URL
      await page.goto(clientViewUrl, { waitUntil: 'networkidle0' });

      // Wait for specific elements to ensure the page is fully loaded
      console.log('Waiting for page content to load...');
      try {
        await page.waitForSelector('.card', { timeout: 10000 });
        console.log('Page content loaded successfully');
      } catch (err) {
        console.warn('Timeout waiting for card element, continuing anyway:', err);
      }

      // Wait for images to load
      console.log('Waiting for images to load...');
      await page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll('img'));
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })
        );
      });

      // Explicitly click the "Contract Terms" tab to ensure it loads
      console.log('Attempting to click the Contract Terms tab...');
      try {
        await page.evaluate(() => {
          const contractTabTrigger = document.querySelector('[role="tab"][data-state="inactive"]');
          if (contractTabTrigger) {
            (contractTabTrigger as HTMLElement).click();
            console.log('Clicked contract tab trigger');
          } else {
            console.warn('Contract tab trigger not found');
          }
        });
        
        // Give time for the tab content to load after clicking
        await page.waitForTimeout(1000);
      } catch (err) {
        console.warn('Error clicking contract tab:', err);
      }

      // Wait for RichTextEditor content to render (used in both Invoice Details and Contract Terms)
      console.log('Waiting for RichTextEditor content to load...');
      try {
        await page.waitForSelector('.rich-text-editor', { timeout: 5000 });
        console.log('RichTextEditor content loaded successfully');
      } catch (err) {
        console.warn('Timeout waiting for RichTextEditor, continuing anyway:', err);
      }

      // Hide elements that shouldn't appear in the PDF (e.g., buttons)
      console.log('Hiding no-print elements...');
      await page.evaluate(() => {
        const elementsToHide = document.querySelectorAll('.no-print, button');
        elementsToHide.forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      });

      // Force display of all tab panels and hide the tab list
      console.log('Setting up tab display for printing...');
      await page.evaluate(() => {
        // Hide the tabs list
        const tabsList = document.querySelector('[data-testid="tabs-list"]');
        if (tabsList) {
          (tabsList as HTMLElement).style.display = 'none';
          console.log('Hidden tabs list with data-testid');
        } else {
          console.warn('TabsList not found with data-testid');
          
          // Fallback: try to find it by role
          const tabsListByRole = document.querySelector('[role="tablist"]');
          if (tabsListByRole) {
            (tabsListByRole as HTMLElement).style.display = 'none';
            console.log('Found and hidden tablist by role');
          }
        }
        
        // Make all tab panels visible
        const tabPanels = document.querySelectorAll('[role="tabpanel"]');
        if (tabPanels && tabPanels.length > 0) {
          console.log(`Found ${tabPanels.length} tab panels by role`);
          tabPanels.forEach((panel, index) => {
            (panel as HTMLElement).style.display = 'block';
            console.log(`Set display:block for panel ${index}`);
            
            // Add page break before the contract tab
            if (index === 1) {
              (panel as HTMLElement).style.pageBreakBefore = 'always';
              console.log('Added page break before panel 1');
            }
          });
        } else {
          console.warn('No tab panels found by role');
          
          // Try specific selectors by data-testid
          const invoiceTab = document.querySelector('[data-testid="invoice-tab"]');
          const contractTab = document.querySelector('[data-testid="contract-tab"]');
          
          if (invoiceTab) {
            (invoiceTab as HTMLElement).style.display = 'block';
            console.log('Found and displayed invoice tab by data-testid');
          }
          
          if (contractTab) {
            (contractTab as HTMLElement).style.display = 'block';
            (contractTab as HTMLElement).style.pageBreakBefore = 'always';
            console.log('Found and displayed contract tab by data-testid with page break');
          }
        }
        
        // Apply CSS to make contract terms visible in printed output
        const style = document.createElement('style');
        style.textContent = `
          @media print {
            [data-testid="tabs-list"] { display: none !important; }
            [data-testid="invoice-tab"], 
            [data-testid="contract-tab"] { display: block !important; }
            [data-testid="contract-tab"] { page-break-before: always !important; }
            .rich-text-editor { display: block !important; }
          }
        `;
        document.head.appendChild(style);
        console.log('Added print-specific styles to document head');
        
        // Check for contract terms content and ensure it's visible
        const richTextEditors = document.querySelectorAll('.rich-text-editor');
        console.log(`Found ${richTextEditors.length} rich text editors`);
        
        // Extra check for contract terms content
        const contractTermsSection = document.querySelector('[data-testid="contract-tab"] .rich-text-editor');
        if (contractTermsSection) {
          console.log('Contract terms section is present in the DOM');
          (contractTermsSection as HTMLElement).style.display = 'block';
          
          // Force visibility of contract term contents
          const contentNodes = contractTermsSection.querySelectorAll('*');
          console.log(`Contract terms has ${contentNodes.length} child nodes`);
          contentNodes.forEach((node) => {
            (node as HTMLElement).style.display = 'block';
            (node as HTMLElement).style.visibility = 'visible';
          });
        } else {
          console.warn('Contract terms section not found by specific selector');
        }
      });

      // Add a small delay to ensure all DOM manipulations are complete
      await page.waitForTimeout(1000);
      
      // Log the final HTML structure for debugging
      console.log('Analyzing DOM structure before PDF generation...');
      await page.evaluate(() => {
        // Log tabs structure
        const tabsElement = document.querySelector('[role="tablist"]');
        console.log('Tabs element:', tabsElement ? 'Found' : 'Not found');
        
        const tabPanels = document.querySelectorAll('[role="tabpanel"]');
        console.log(`Tab panels by role: ${tabPanels.length}`);
        
        const invoiceTab = document.querySelector('[data-testid="invoice-tab"]');
        console.log('Invoice tab by data-testid:', invoiceTab ? 'Found' : 'Not found');
        
        const contractTab = document.querySelector('[data-testid="contract-tab"]');
        console.log('Contract tab by data-testid:', contractTab ? 'Found' : 'Not found');
        
        if (contractTab) {
          console.log('Contract tab display style:', (contractTab as HTMLElement).style.display);
          console.log('Contract tab visibility:', (contractTab as HTMLElement).style.visibility);
          console.log('Contract tab content HTML (truncated):', contractTab.innerHTML.substring(0, 100) + '...');
        }
        
        // Check rich text editor
        const richTextEditors = document.querySelectorAll('.rich-text-editor');
        console.log(`Rich text editors: ${richTextEditors.length}`);
        
        if (richTextEditors.length > 0) {
          richTextEditors.forEach((editor, i) => {
            console.log(`Rich text editor ${i} display:`, (editor as HTMLElement).style.display);
            console.log(`Rich text editor ${i} visibility:`, (editor as HTMLElement).style.visibility);
            console.log(`Rich text editor ${i} content length:`, editor.innerHTML.length);
          });
        }
      });

      // Generate PDF
      console.log('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      console.log('PDF generation complete. Size:', pdfBuffer.byteLength, 'bytes');
      console.log('Closing browser...');
      await browser.close();

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
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
