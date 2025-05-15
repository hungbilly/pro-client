
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EmailVariables = Record<string, string | number | boolean | Date | null>;

interface EmailPayload {
  templateId?: string;
  templateName?: string;
  recipientEmail: string;
  recipientUserId?: string;
  customSubject?: string;
  customBody?: string;
  variables?: EmailVariables;
  category?: string;
}

// Helper function to replace variables in templates
function replaceVariables(text: string, variables: EmailVariables): string {
  if (!variables || !text) return text || '';
  
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return variables[trimmedKey] !== undefined 
      ? String(variables[trimmedKey]) 
      : match;
  });
}

// Helper function to validate email configuration
async function validateEmailConfig() {
  const emailHost = Deno.env.get("EMAIL_HOST");
  const emailPort = Number(Deno.env.get("EMAIL_PORT"));
  const emailUsername = Deno.env.get("EMAIL_USERNAME");
  const emailPassword = Deno.env.get("EMAIL_PASSWORD");
  const emailFrom = Deno.env.get("EMAIL_FROM");

  // Log all environment variables to diagnose issues
  console.log("======== DETAILED EMAIL CONFIGURATION DEBUG ========");
  console.log(`EMAIL_HOST: ${emailHost || 'UNDEFINED'}`);
  console.log(`EMAIL_PORT: ${emailPort || 'UNDEFINED'}`);
  console.log(`EMAIL_USERNAME: ${emailUsername ? '✓ SET (hidden)' : 'UNDEFINED'}`);
  console.log(`EMAIL_PASSWORD: ${emailPassword ? '✓ SET (hidden)' : 'UNDEFINED'}`);
  console.log(`EMAIL_FROM: ${emailFrom || 'UNDEFINED'}`);
  
  // List all available environment variables (without values for security)
  console.log("\n======== ALL AVAILABLE ENVIRONMENT VARIABLES ========");
  const envKeys = Object.keys(Deno.env.toObject());
  console.log(`Available env variables: ${envKeys.join(", ")}`);
  console.log("====================================================\n");

  console.log("Email configuration:", {
    host: emailHost, 
    port: emailPort,
    username: emailUsername ? "✓ Set" : "✗ Missing", 
    password: emailPassword ? "✓ Set" : "✗ Missing",
    from: emailFrom
  });

  if (!emailHost || !emailPort || !emailUsername || !emailPassword || !emailFrom) {
    return { isValid: false, message: "Email credentials not configured properly" };
  }

  // Test DNS resolution
  try {
    console.log(`Testing DNS resolution for ${emailHost}...`);
    const dnsTestStart = performance.now();
    
    try {
      // Attempt to create a connection to test DNS resolution
      const conn = await Deno.connect({
        hostname: emailHost,
        port: emailPort
      });
      
      // Close the connection immediately, we just wanted to test resolution
      conn.close();
      
      const dnsTestDuration = performance.now() - dnsTestStart;
      console.log(`DNS resolution successful for ${emailHost} (took ${dnsTestDuration.toFixed(2)}ms)`);
      return { isValid: true, message: "Email configuration valid" };
    } catch (dnsError) {
      console.error(`DNS resolution failed for ${emailHost}:`, dnsError);
      return { 
        isValid: false, 
        message: `DNS resolution for ${emailHost} failed: ${dnsError.message}` 
      };
    }
  } catch (error) {
    console.error("Error testing DNS resolution:", error);
    return { isValid: false, message: `Error testing DNS: ${error.message}` };
  }
}

serve(async (req) => {
  console.log("====== REQUEST RECEIVED ======");
  console.log(`Method: ${req.method}, URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate email configuration
    const configValidation = await validateEmailConfig();
    if (!configValidation.isValid) {
      console.error("Email configuration invalid:", configValidation.message);
      return new Response(JSON.stringify({ 
        error: 'Email configuration invalid', 
        details: configValidation.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log("Authorization header missing");
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    console.log("Initializing Supabase client with URL:", supabaseUrl);
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Verify if request is from an admin or the service role key
    let isAdmin = false;
    let isServiceRole = authHeader === `Bearer ${supabaseKey}`;
    console.log("Auth check - Service role key match:", isServiceRole);

    if (!isServiceRole) {
      // Check if it's an admin user
      console.log("Not service role, checking if admin user");
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (userError || !user) {
        console.error("Invalid token:", userError);
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`User authenticated, ID: ${user.id}`);
      
      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return new Response(JSON.stringify({ error: 'Error fetching user profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!profile || !profile.is_admin) {
        console.log("User is not admin, is_admin:", profile?.is_admin);
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      isAdmin = true;
      console.log("Admin user confirmed");
    }

    console.log("Parsing request body");
    const requestData = await req.json() as EmailPayload;
    console.log("Email payload:", {
      recipientEmail: requestData.recipientEmail,
      hasTemplate: Boolean(requestData.templateId || requestData.templateName),
      hasCustomContent: Boolean(requestData.customSubject || requestData.customBody),
      templateId: requestData.templateId,
      templateName: requestData.templateName,
    });

    // Non-admins can only send predefined templates (not custom emails)
    if (!isAdmin && !isServiceRole && (requestData.customSubject || requestData.customBody)) {
      console.log("Permission denied: Non-admin attempting to send custom email");
      return new Response(JSON.stringify({ error: 'Permission denied. Only admins can send custom emails.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set up email content
    let subject = requestData.customSubject || '';
    let body = requestData.customBody || '';
    let template;

    // Get the email template if specified
    if (requestData.templateId || requestData.templateName) {
      console.log("Fetching email template", {
        byId: Boolean(requestData.templateId),
        byName: Boolean(requestData.templateName)
      });
      
      const query = supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true);
        
      if (requestData.templateId) {
        query.eq('id', requestData.templateId);
      } else if (requestData.templateName) {
        query.eq('name', requestData.templateName);
      }
      
      const { data: templateData, error: templateError } = await query.single();

      if (templateError || !templateData) {
        console.error("Template not found:", templateError);
        return new Response(JSON.stringify({ error: 'Template not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log("Template found:", {
        id: templateData.id,
        name: templateData.name,
        category: templateData.category,
      });
      
      template = templateData;
      subject = template.subject;
      body = template.body;
    }

    // Apply variable substitution if needed
    if (requestData.variables) {
      console.log("Substituting variables in template");
      subject = replaceVariables(subject, requestData.variables);
      body = replaceVariables(body, requestData.variables);
    }

    // Verify we have content to send
    if (!subject || !body) {
      console.error("Missing email content:", { subject: Boolean(subject), body: Boolean(body) });
      return new Response(JSON.stringify({ error: 'Missing email content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get email credentials
    const emailHost = Deno.env.get("EMAIL_HOST");
    const emailPort = Number(Deno.env.get("EMAIL_PORT"));
    const emailUsername = Deno.env.get("EMAIL_USERNAME");
    const emailPassword = Deno.env.get("EMAIL_PASSWORD");
    const emailFrom = Deno.env.get("EMAIL_FROM");

    if (!emailHost || !emailPort || !emailUsername || !emailPassword || !emailFrom) {
      console.error("Email credentials not configured");
      return new Response(JSON.stringify({ error: 'Email credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set up the SMTP client with detailed logging
    console.log("Setting up SMTP client:", {
      host: emailHost,
      port: emailPort,
      from: emailFrom,
      to: requestData.recipientEmail,
    });
    
    try {
      const client = new SMTPClient({
        connection: {
          hostname: emailHost,
          port: emailPort,
          tls: true,
          auth: {
            username: emailUsername,
            password: emailPassword,
          },
        },
        crlf: true, // Ensure proper CRLF line endings in email
      });

      console.log("SMTP client initialized successfully");

      // Convert plain text to simple HTML
      const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${body.split('\n').map(line => `<p>${line}</p>`).join('')}
      </div>`;

      console.log("Sending email...");
      console.log("Email content summary:", {
        subject: subject,
        bodyLength: body.length,
        recipient: requestData.recipientEmail,
      });

      // Send the email
      try {
        const sendStart = performance.now();
        const result = await client.send({
          from: emailFrom,
          to: requestData.recipientEmail,
          subject: subject,
          content: body,
          html: htmlBody,
        });
        const sendDuration = performance.now() - sendStart;
        console.log(`Email sent successfully (took ${sendDuration.toFixed(2)}ms):`, result);
      } catch (sendError) {
        console.error("Error during SMTP send operation:", sendError);
        throw sendError;
      }

      try {
        // Close SMTP connection
        console.log("Closing SMTP connection");
        await client.close();
        console.log("SMTP connection closed successfully");
      } catch (closeError) {
        console.error("Error closing SMTP connection:", closeError);
        // Don't throw here, just log the error as the email was already sent
      }

      // Record the email in the history
      console.log("Recording email in history");
      try {
        const { data: emailRecord, error: emailRecordError } = await supabase
          .from('email_history')
          .insert({
            template_id: template?.id,
            recipient_email: requestData.recipientEmail,
            recipient_user_id: requestData.recipientUserId,
            subject: subject,
            body: body,
            status: 'sent',
          })
          .select()
          .single();

        if (emailRecordError) {
          console.error('Failed to record email history:', emailRecordError);
        } else {
          console.log('Email history recorded:', emailRecord.id);
        }
      } catch (historyError) {
        console.error("Error recording email history:", historyError);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        email_id: emailRecord?.id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (smtpError) {
      console.error('Error setting up or using SMTP client:', smtpError);
      return new Response(JSON.stringify({ 
        error: 'Failed to send email', 
        details: smtpError.message || String(smtpError)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to send email', 
      details: error.message || String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
