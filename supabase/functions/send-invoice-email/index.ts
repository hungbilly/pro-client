
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

// Improved function to normalize line endings to CRLF
function normalizeCRLF(text: string): string {
  // First normalize all existing line endings to a single LF
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Then convert all single LF to CRLF
  normalized = normalized.replace(/\n/g, '\r\n');
  
  return normalized;
}

// Helper function to visualize line endings for debugging without adding extra newlines
function visualizeLineEndings(text: string): string {
  return text
    .replace(/\r\n/g, "\\r\\n ")  // Replace CRLF with visible markers (no newline)
    .replace(/\n/g, "\\n ")       // Replace LF with visible marker (no newline)
    .replace(/\r/g, "\\r ");      // Replace CR with visible marker (no newline)
}

// Function to log raw bytes of a string for debugging
function logRawBytes(str: string, label: string): void {
  console.log(`${label} (${str.length} chars):`);
  const bytes = Array.from(str).map(c => {
    const code = c.charCodeAt(0);
    return code.toString(16).padStart(2, '0') + (code === 13 ? "(CR)" : code === 10 ? "(LF)" : "");
  });
  console.log(bytes.join(' '));
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

    // Format the email content
    const subject = `Invoice ${invoiceNumber}`;
    const rawText = `Dear ${clientName || 'Client'},

Please find your invoice (${invoiceNumber}) at the following link:
${invoiceUrl}

${additionalMessage ? additionalMessage + '\n\n' : ''}
Thank you for your business.`;

    // Normalize to ensure proper CRLF line endings
    const text = normalizeCRLF(rawText);
    
    // Extensive logging for debugging
    console.log("Raw text before normalization:");
    console.log(visualizeLineEndings(rawText));
    console.log("Normalized text with CRLF:");
    console.log(visualizeLineEndings(text));
    
    // Log raw bytes to see exactly what's happening with the line endings
    logRawBytes(text.substring(0, 100), "First 100 bytes of normalized text");
    
    // Also log a few sample lines with their raw bytes
    const lines = text.split(/\r\n/);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      logRawBytes(line, `Line ${i+1}`);
      if (i < lines.length - 1) { // Add CRLF for all but the last line
        logRawBytes("\r\n", "CRLF");
      }
    }

    // HTML version (browsers handle line endings automatically)
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
      // Create SMTP client with correct line ending settings
      client = new SMTPClient({
        connection: {
          hostname: EMAIL_HOST,
          port: EMAIL_PORT,
          tls: true,
          auth: {
            username: EMAIL_USERNAME,
            password: EMAIL_PASSWORD,
          },
          timeout: 15000, // 15 seconds timeout
        },
        // Force explicit CRLF line endings in email headers and content
        crlf: true,
      });
      
      console.log("SMTP client created, attempting to send email...");
      
      // Create email data object with normalized text
      const emailData = {
        from: EMAIL_FROM,
        to: clientEmail,
        subject: subject,
        content: text,
        html: html,
      };
      
      console.log("Email data prepared:", JSON.stringify({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject
      }));
      
      // Send email
      sendResult = await client.send(emailData);
      
      console.log("Email sent successfully:", sendResult);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email sent to ${clientEmail}`,
          debug: {
            rawTextSample: visualizeLineEndings(rawText.substring(0, 100)),
            normalizedTextSample: visualizeLineEndings(text.substring(0, 100)),
            lineEndingsFixed: true,
            emailDetails: {
              from: EMAIL_FROM,
              to: clientEmail,
              subject: subject
            }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error("SMTP Error:", error);
      return new Response(
        JSON.stringify({ 
          error: 'SMTP Error', 
          message: error.message || String(error),
          debug: {
            rawTextSample: visualizeLineEndings(rawText.substring(0, 100)),
            normalizedTextSample: visualizeLineEndings(text.substring(0, 100)),
            error: String(error)
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      // Clean up resources
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
