
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Maximum number of emails to process per batch
const BATCH_SIZE = 50;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header - either a user token or service role key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Only allow service role key or verified admins
    let isAdmin = false;

    // Check if this is the service role key
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      // It's not the service role key, so verify if it's an admin user
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

    const requestData = req.headers.get('Content-Type') === 'application/json' 
      ? await req.json() 
      : { processAll: false };
      
    const processAll = requestData.processAll === true;
    
    // Define query to get emails that need to be sent
    let query = supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());
      
    if (!processAll) {
      // Limit the batch size
      query = query.limit(BATCH_SIZE);
    }
      
    // Get emails to process
    const { data: emailsToProcess, error: fetchError } = await query.order('scheduled_for', { ascending: true });
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!emailsToProcess || emailsToProcess.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No emails to process' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${emailsToProcess.length} emails`);
    
    const results = [];
    
    // Process each email
    for (const email of emailsToProcess) {
      try {
        let variables = email.variables || {};
        const recipientEmail = email.recipient_email;
        
        // Prepare data for email sending
        const emailData: any = {
          recipientEmail,
          recipientUserId: email.recipient_user_id
        };
        
        // Use template or custom content
        if (email.template_id) {
          emailData.templateId = email.template_id;
        } else {
          emailData.customSubject = email.custom_subject;
          emailData.customBody = email.custom_body;
        }
        
        // Add variables if available
        if (variables) {
          // Ensure all required variables are present
          if (!variables.name) {
            const emailUsername = recipientEmail.split('@')[0];
            // Format the username by capitalizing and removing special chars
            const formattedUsername = emailUsername
              .replace(/[._-]/g, ' ')
              .replace(/\b\w/g, char => char.toUpperCase());
            
            variables.name = formattedUsername;
          }
          
          if (!variables.firstName && variables.name) {
            variables.firstName = variables.name.split(' ')[0] || '';
          }
          
          if (!variables.lastName && variables.name && variables.name.includes(' ')) {
            variables.lastName = variables.name.split(' ').slice(1).join(' ');
          }
          
          emailData.variables = variables;
        }
        
        // Send the email using send-system-email function
        const result = await supabase.functions.invoke('send-system-email', {
          body: emailData,
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}` // Use service role key for auth
          }
        });
        
        if (result.error) {
          throw new Error(`Send email error: ${result.error.message || JSON.stringify(result.error)}`);
        }
        
        // Update email status
        const { error: updateError } = await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);
          
        if (updateError) {
          console.error(`Error updating email status for ${email.id}:`, updateError);
        }
        
        results.push({
          id: email.id,
          recipient: recipientEmail,
          success: true
        });
        
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        
        // Update email status to 'failed'
        try {
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'failed'
            })
            .eq('id', email.id);
        } catch (updateError) {
          console.error(`Error updating failed status for ${email.id}:`, updateError);
        }
        
        results.push({
          id: email.id,
          recipient: email.recipient_email,
          success: false,
          error: error.message || String(error)
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return new Response(JSON.stringify({ 
      success: true, 
      processed: emailsToProcess.length,
      successful: successCount,
      failed: failureCount,
      details: results
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
