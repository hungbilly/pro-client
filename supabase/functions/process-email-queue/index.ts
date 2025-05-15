
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log("Processing email queue...");
    
    // Find emails that need to be sent (scheduled for now or in the past and still pending)
    const { data: emailsToSend, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process in batches for better performance
      
    if (fetchError) {
      console.error("Error fetching emails to send:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found ${emailsToSend?.length || 0} emails to process`);
    
    if (!emailsToSend || emailsToSend.length === 0) {
      return new Response(JSON.stringify({ message: "No emails to process" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Process each email
    const results = await Promise.allSettled(emailsToSend.map(async (email) => {
      try {
        console.log(`Processing email ID: ${email.id}`);
        
        // Prepare the email payload
        const payload = {
          templateId: email.template_id,
          recipientEmail: email.recipient_email,
          recipientUserId: email.recipient_user_id,
          customSubject: email.custom_subject,
          customBody: email.custom_body,
          variables: email.variables,
        };
        
        // Call the send-system-email function
        const { data: sendResult, error: sendError } = await supabase.functions.invoke(
          'send-system-email',
          {
            body: JSON.stringify(payload),
          }
        );
        
        if (sendError) {
          throw new Error(`Send email error: ${sendError.message}`);
        }
        
        // Update the scheduled email status
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);
          
        return { id: email.id, success: true };
        
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        
        // Update as failed
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id);
          
        return { id: email.id, success: false, error: String(error) };
      }
    }));
    
    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    console.log(`Processed ${successful + failed} emails: ${successful} successful, ${failed} failed`);
    
    return new Response(JSON.stringify({
      message: `Processed ${successful + failed} emails: ${successful} successful, ${failed} failed`,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error("Error in process-email-queue:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
