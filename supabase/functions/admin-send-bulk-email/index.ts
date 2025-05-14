
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BulkEmailPayload {
  emailMode: 'template' | 'custom';
  templateId?: string;
  customSubject?: string;
  customBody?: string;
  recipientGroup: string;
  scheduledFor?: string;
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

    // Verify if request is from an admin
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

    const requestData = await req.json() as BulkEmailPayload;

    // Validate the request
    if (requestData.emailMode === 'template' && !requestData.templateId) {
      return new Response(JSON.stringify({ error: 'Template ID is required for template mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (requestData.emailMode === 'custom' && (!requestData.customSubject || !requestData.customBody)) {
      return new Response(JSON.stringify({ error: 'Subject and body are required for custom mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!requestData.recipientGroup) {
      return new Response(JSON.stringify({ error: 'Recipient group is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get users based on recipient group
    let usersQuery = supabase.from('profiles').select('id, email');
    
    switch (requestData.recipientGroup) {
      case 'trial':
        // Users in trial period
        const { data: trialUsers } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .gt('trial_end_date', new Date().toISOString());
        
        if (trialUsers && trialUsers.length > 0) {
          usersQuery = usersQuery.in('id', trialUsers.map(u => u.user_id));
        } else {
          // No users in this group
          return new Response(JSON.stringify({ success: true, message: 'No users in this group' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;
        
      case 'active':
        // Users with active subscriptions
        const { data: activeUsers } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('status', 'active');
        
        if (activeUsers && activeUsers.length > 0) {
          usersQuery = usersQuery.in('id', activeUsers.map(u => u.user_id));
        } else {
          // No users in this group
          return new Response(JSON.stringify({ success: true, message: 'No users in this group' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;
        
      case 'expired':
        // Users with expired trials
        const { data: expiredUsers } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .lt('trial_end_date', new Date().toISOString())
          .not('status', 'eq', 'active');
        
        if (expiredUsers && expiredUsers.length > 0) {
          usersQuery = usersQuery.in('id', expiredUsers.map(u => u.user_id));
        } else {
          // No users in this group
          return new Response(JSON.stringify({ success: true, message: 'No users in this group' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;
        
      // 'all' is the default - no additional filtering needed
    }
    
    const { data: users, error: usersError } = await usersQuery;
    
    if (usersError) {
      throw usersError;
    }
    
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No recipients found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get template details if needed
    let templateSubject = '';
    let templateBody = '';
    let templateId = null;
    
    if (requestData.emailMode === 'template' && requestData.templateId) {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', requestData.templateId)
        .single();
      
      if (templateError || !template) {
        return new Response(JSON.stringify({ error: 'Template not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      templateSubject = template.subject;
      templateBody = template.body;
      templateId = template.id;
    } else {
      templateSubject = requestData.customSubject || '';
      templateBody = requestData.customBody || '';
    }

    // Determine if this is immediate or scheduled
    const isScheduled = !!requestData.scheduledFor;
    const scheduledFor = requestData.scheduledFor ? new Date(requestData.scheduledFor) : null;
    
    // Prepare batch of scheduled emails
    const scheduledEmails = users.map(user => ({
      recipient_email: user.email,
      recipient_user_id: user.id,
      template_id: templateId,
      custom_subject: requestData.emailMode === 'custom' ? templateSubject : null,
      custom_body: requestData.emailMode === 'custom' ? templateBody : null,
      status: isScheduled ? 'scheduled' : 'pending',
      scheduled_for: isScheduled ? scheduledFor?.toISOString() : new Date().toISOString(),
      variables: {
        email: user.email,
        user_id: user.id
      }
    }));
    
    // Insert scheduled emails
    const { data: insertedEmails, error: insertError } = await supabase
      .from('scheduled_emails')
      .insert(scheduledEmails)
      .select();
    
    if (insertError) {
      throw insertError;
    }
    
    // If emails are for immediate sending, trigger the processor
    if (!isScheduled) {
      // This would process the emails right away
      // In a production system, you might want to use a background task
      // or a separate worker process for this to avoid timeouts
      await supabase.functions.invoke('process-email-queue', {
        body: { processAll: true }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: isScheduled ? 'Emails scheduled successfully' : 'Emails queued for sending',
      count: scheduledEmails.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing bulk email request:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process email request', 
      details: error.message || String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
