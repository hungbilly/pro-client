
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    if (!isServiceRole) {
      // Check if it's an admin user
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || !profile.is_admin) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      isAdmin = true;
    }

    const requestData = await req.json() as EmailPayload;

    // Non-admins can only send predefined templates (not custom emails)
    if (!isAdmin && !isServiceRole && (requestData.customSubject || requestData.customBody)) {
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
        return new Response(JSON.stringify({ error: 'Template not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      template = templateData;
      subject = template.subject;
      body = template.body;
    }

    // Apply variable substitution if needed
    if (requestData.variables) {
      subject = replaceVariables(subject, requestData.variables);
      body = replaceVariables(body, requestData.variables);
    }

    // Verify we have content to send
    if (!subject || !body) {
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
      return new Response(JSON.stringify({ error: 'Email credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set up the SMTP client
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

    // Convert plain text to simple HTML
    const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${body.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>`;

    // Send the email
    const result = await client.send({
      from: emailFrom,
      to: requestData.recipientEmail,
      subject: subject,
      content: body,
      html: htmlBody,
    });

    // Record the email in the history
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
    }

    // Close SMTP connection
    await client.close();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully',
      email_id: emailRecord?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
