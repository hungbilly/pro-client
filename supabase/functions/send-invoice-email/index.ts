
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email configuration from environment variables
const EMAIL_HOST = Deno.env.get('EMAIL_HOST');
const EMAIL_PORT = Number(Deno.env.get('EMAIL_PORT') || '587');
const EMAIL_USERNAME = Deno.env.get('EMAIL_USERNAME');
const EMAIL_PASSWORD = Deno.env.get('EMAIL_PASSWORD');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate email configuration
    if (!EMAIL_HOST || !EMAIL_USERNAME || !EMAIL_PASSWORD || !EMAIL_FROM) {
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

    // Create SMTP client
    const client = new SmtpClient();
    
    // Connect to the SMTP server
    await client.connectTLS({
      hostname: EMAIL_HOST,
      port: EMAIL_PORT,
      username: EMAIL_USERNAME,
      password: EMAIL_PASSWORD,
    });
    
    // Format the email content
    const subject = `Invoice ${invoiceNumber}`;
    const text = `Dear ${clientName || 'Client'},

Please find your invoice (${invoiceNumber}) at the following link:
${invoiceUrl}

${additionalMessage ? additionalMessage + '\n\n' : ''}
Thank you for your business.`;

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

    // Send the email
    await client.send({
      from: EMAIL_FROM,
      to: clientEmail,
      subject: subject,
      content: text,
      html: html,
    });
    
    // Close the connection
    await client.close();
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to ${clientEmail}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in send-invoice-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
