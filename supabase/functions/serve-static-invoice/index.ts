
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

serve(async (req) => {
  console.log("Request to serve-static-invoice function:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract invoice view link from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const viewLink = pathParts[pathParts.length - 1];
    
    if (!viewLink) {
      console.error("No view link provided in the URL");
      return new Response(
        JSON.stringify({ error: "No view link provided" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }
    
    console.log("Retrieving invoice with view link:", viewLink);
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    // Get invoice by view link
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, html_content, html_generated_at")
      .eq("view_link", viewLink)
      .maybeSingle();

    if (invoiceError) {
      console.error("Error retrieving invoice:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Error retrieving invoice", details: invoiceError }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    if (!invoice) {
      console.error("Invoice not found with view link:", viewLink);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { 
          status: 404, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    // Check if we already have generated HTML content that is not too old
    if (invoice.html_content && invoice.html_generated_at) {
      const generatedAt = new Date(invoice.html_generated_at);
      const now = new Date();
      const diffInHours = Math.abs(now.getTime() - generatedAt.getTime()) / 36e5;
      
      // If HTML was generated less than 24 hours ago, serve it
      if (diffInHours < 24) {
        console.log("Serving cached HTML content generated at:", invoice.html_generated_at);
        return new Response(invoice.html_content, {
          headers: {
            "Content-Type": "text/html",
            ...corsHeaders
          }
        });
      }
    }
    
    // We need to generate new HTML
    console.log("No recent HTML content found, retrieving related data to generate HTML");

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", invoice.client_id)
      .maybeSingle();

    if (clientError) {
      console.error("Error retrieving client:", clientError);
    }

    // Get company data
    let company = null;
    if (invoice.company_id) {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", invoice.company_id)
        .maybeSingle();

      if (companyError) {
        console.error("Error retrieving company:", companyError);
      } else {
        company = companyData;
      }
    }

    // Get job data if applicable
    let job = null;
    if (invoice.job_id) {
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", invoice.job_id)
        .maybeSingle();

      if (jobError) {
        console.error("Error retrieving job:", jobError);
      } else {
        job = jobData;
      }
    }

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id);

    if (itemsError) {
      console.error("Error retrieving invoice items:", itemsError);
    } else {
      invoice.items = items;
    }

    // Import the function to generate HTML
    const { formatCurrency, generateInvoiceHTML } = await import("./invoice-html.ts");
    
    // Generate HTML
    console.log("Generating HTML for invoice");
    const html = generateInvoiceHTML(invoice, client, company, job);

    // Update the invoice with the new HTML and timestamp
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        html_content: html,
        html_generated_at: new Date().toISOString()
      })
      .eq("id", invoice.id);

    if (updateError) {
      console.error("Error updating invoice HTML content:", updateError);
    } else {
      console.log("Successfully updated invoice HTML content");
    }

    // Return the generated HTML
    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in serve-static-invoice function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  }
});
