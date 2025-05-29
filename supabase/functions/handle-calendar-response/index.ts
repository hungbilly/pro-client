
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { calendarEventId, attendeeEmail, responseStatus } = await req.json()

    console.log('Processing calendar response:', { calendarEventId, attendeeEmail, responseStatus })

    // Find the job teammate record
    const { data: jobTeammate, error: findError } = await supabaseClient
      .from('job_teammates')
      .select('*')
      .eq('calendar_event_id', calendarEventId)
      .eq('teammate_email', attendeeEmail)
      .single()

    if (findError || !jobTeammate) {
      console.error('Job teammate not found:', findError)
      throw new Error('Job teammate not found')
    }

    // Update the invitation status based on response
    let newStatus = 'pending'
    if (responseStatus === 'accepted') {
      newStatus = 'accepted'
    } else if (responseStatus === 'declined') {
      newStatus = 'declined'
    }

    // Update job teammate status
    const { error: updateError } = await supabaseClient
      .from('job_teammates')
      .update({
        invitation_status: newStatus,
        responded_at: new Date().toISOString()
      })
      .eq('id', jobTeammate.id)

    if (updateError) {
      console.error('Error updating job teammate:', updateError)
      throw new Error('Failed to update teammate status')
    }

    // Record the response in the responses table
    const { error: responseError } = await supabaseClient
      .from('teammate_calendar_responses')
      .insert({
        job_teammate_id: jobTeammate.id,
        calendar_event_id: calendarEventId,
        response_status: responseStatus,
        responded_at: new Date().toISOString()
      })

    if (responseError) {
      console.error('Error recording response:', responseError)
      // Don't throw here as the main update succeeded
    }

    console.log('Successfully processed calendar response')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Calendar response processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in handle-calendar-response:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
