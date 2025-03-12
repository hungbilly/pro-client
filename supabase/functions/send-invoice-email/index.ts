
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email configuration from environment variables
const EMAIL_HOST = Deno.env.get('EMAIL_HOST') || "mail.webhost66.com";
const EMAIL_PORT = 465; // Using port 465 as requested
const EMAIL_USERNAME = Deno.env.get('EMAIL_USERNAME');
const EMAIL_PASSWORD = Deno.env.get('EMAIL_PASSWORD');
const EMAIL_FROM = "info@billyhung.com"; // Fixed email address

// Function to ensure CRLF line endings
function normalizeCRLF(text: string): string {
  // First, normalize all line endings to LF
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Then convert all LFs to CRLFs
  return normalized.replace(/\n/g, '\r\n');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate email configuration
    if (!EMAIL_USERNAME || !EMAIL_PASSWORD) {
      console.error('Missing email configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', message: 'Email server not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request data
    const { clientEmail, clientName, invoiceNumber, invoiceUrl, additionalMessage } = await req.json();
    
    if (!clientEmail || !invoiceNumber || !invoiceUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log connection parameters for debugging
    console.log(`Connecting to SMTP server: ${EMAIL_HOST}:${EMAIL_PORT}`);
    console.log(`Using username: ${EMAIL_USERNAME}`);

    // Format the email content with CRLF line endings
    const subject = `Invoice ${invoiceNumber}`;
    const rawText = `Dear ${clientName || 'Client'},

Please find your invoice (${invoiceNumber}) at the following link:
${invoiceUrl}

${additionalMessage ? additionalMessage + '\n\n' : ''}
Thank you for your business.`;

    // Ensure proper CRLF line endings for the text part
    const text = normalizeCRLF(rawText);

    // HTML doesn't need CRLF normalization as browsers handle this automatically
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">Invoice ${invoiceNumber}</h2>
      <p>Dear ${clientName || 'Client'},</p>
      <p>Please find your invoice (${invoiceNumber}) at the following link:</p>
      <p><a href="${invoiceUrl}" style="color: #3182ce; text-decoration: underline;">${invoiceUrl}</a></p>
      ${additionalMessage ? `<p>${additionalMessage}</p>` : ''}
      <p>Thank you for your business.</p>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #718096; font-size: 0.9em;">This is an automated email, please do not reply directly.</p>
      </div>
    </div>
    `;

    console.log(`Sending email to: ${clientEmail}`);
    
    let client = null;
    let sendResult = null;
    
    try {
      // Create SMTP client with more conservative timeouts
      client = new SMTPClient({
        connection: {
          hostname: EMAIL_HOST,
          port: EMAIL_PORT,
          tls: true,
          auth: {
            username: EMAIL_USERNAME,
            password: EMAIL_PASSWORD,
          },
          // Add explicit timeouts to prevent hanging connections
          timeout: 10000, // 10 seconds timeout
        },
      });
      
      console.log("SMTP client created, attempting to send email...");
      
      // Send email - denomailer expects CRLF, but we'll ensure it's properly formatted anyway
      sendResult = await client.send({
        from: EMAIL_FROM,
        to: clientEmail,
        subject: subject,
        content: text,
        html: html,
      });
      
      console.log("Email sent successfully:", sendResult);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email sent to ${clientEmail}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error("SMTP Error:", error);
      return new Response(
        JSON.stringify({ 
          error: 'SMTP Error', 
          message: error.message || String(error)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      // Clean up resources in a more defensive way
      if (client) {
        try {
          // Create a timeout to ensure this doesn't hang
          const closePromise = client.close();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("SMTP close timeout")), 5000)
          );
          
          await Promise.race([closePromise, timeoutPromise])
            .catch(err => console.warn("Warning during SMTP connection close:", err));
            
          console.log("SMTP connection handling completed");
        } catch (closeError) {
          // Just log the error but don't throw
          console.warn("Warning during SMTP cleanup:", closeError);
        }
      }
    }
  } catch (error) {
    console.error('Error in send-invoice-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
