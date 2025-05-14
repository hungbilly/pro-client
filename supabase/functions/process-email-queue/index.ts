
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function replaceVariables(text: string, variables: Record<string, any>): string {
  if (!variables) return text;
  
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

    const { processAll = false } = await req.json();
    const now = new Date();
    
    // Fetch emails that need processing
    // Either scheduled for now or in the past, or all pending if processAll is true
    let query = supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending');
      
    if (!processAll) {
      query = query.lte('scheduled_for', now.toISOString());
    }
    
    query = query.limit(50); // Process in batches to avoid timeouts
    
    const { data: pendingEmails, error: fetchError } = await query;
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No emails to process' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Processing ${pendingEmails.length} emails`);
    
    // Process each email
    const results = await Promise.all(pendingEmails.map(async (email) => {
      try {
        // Update status to processing
        await supabase
          .from('scheduled_emails')
          .update({ status: 'processing' })
          .eq('id', email.id);
        
        // Prepare email content
        let subject = '';
        let body = '';
        
        if (email.template_id) {
          // Get template
          const { data: template, error: templateError } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', email.template_id)
            .single();
          
          if (templateError || !template) {
            throw new Error('Template not found');
          }
          
          subject = template.subject;
          body = template.body;
        } else {
          // Use custom content
          subject = email.custom_subject || '';
          body = email.custom_body || '';
        }
        
        // Apply variable substitution
        if (email.variables) {
          subject = replaceVariables(subject, email.variables);
          body = replaceVariables(body, email.variables);
        }
        
        // Send the email
        const sendResult = await supabase.functions.invoke('send-system-email', {
          body: {
            recipientEmail: email.recipient_email,
            recipientUserId: email.recipient_user_id,
            customSubject: subject,
            customBody: body
          }
        });
        
        if (sendResult.error) {
          throw new Error(sendResult.error.message || 'Failed to send email');
        }
        
        // Update status to sent
        await supabase
          .from('scheduled_emails')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);
          
        // Record in email history
        await supabase
          .from('email_history')
          .insert({
            template_id: email.template_id,
            recipient_email: email.recipient_email,
            recipient_user_id: email.recipient_user_id,
            subject: subject,
            body: body,
            status: 'sent'
          });
        
        return { id: email.id, success: true };
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        
        // Update status to failed
        await supabase
          .from('scheduled_emails')
          .update({ 
            status: 'failed',
            error_message: error.message || String(error)
          })
          .eq('id', email.id);
          
        // Record in email history
        await supabase
          .from('email_history')
          .insert({
            template_id: email.template_id,
            recipient_email: email.recipient_email,
            recipient_user_id: email.recipient_user_id,
            subject: email.custom_subject || '[Failed]',
            body: email.custom_body || '',
            status: 'failed',
            error_message: error.message || String(error)
          });
        
        return { id: email.id, success: false, error: error.message || String(error) };
      }
    }));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${results.length} emails: ${successful} succeeded, ${failed} failed`,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process email queue', 
      details: error.message || String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
