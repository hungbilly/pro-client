
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    const { jobId, teammates, timeZone } = await req.json()

    console.log('Inviting teammates to job:', {
      jobId,
      teammates: teammates?.length || 0,
      timeZone
    })

    // First, verify the job exists
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Job lookup error:', jobError)
      throw new Error(`Job not found: ${jobId}`)
    }

    console.log('Found job:', job.title)

    // Remove existing job teammates for this job (to avoid duplicates)
    const { error: deleteError } = await supabaseClient
      .from('job_teammates')
      .delete()
      .eq('job_id', jobId)

    if (deleteError) {
      console.error('Error removing existing teammates:', deleteError)
    }

    // Process each teammate
    const results = []
    for (const teammate of teammates) {
      try {
        console.log('Processing teammate:', teammate.email)

        // For existing teammates, check if they exist in the teammates table
        let teammateRecord = null
        if (teammate.id) {
          const { data: existingTeammate } = await supabaseClient
            .from('teammates')
            .select('*')
            .eq('id', teammate.id)
            .single()
          
          teammateRecord = existingTeammate
        }

        // If it's a new teammate (no ID or not found), create the teammate record
        if (!teammateRecord && teammate.isNew !== false) {
          const { data: newTeammate, error: teammateError } = await supabaseClient
            .from('teammates')
            .insert({
              name: teammate.name,
              email: teammate.email,
              company_id: job.company_id,
              user_id: job.client_id // This might need to be adjusted based on your schema
            })
            .select()
            .single()

          if (teammateError) {
            console.error('Error creating teammate:', teammateError)
          } else {
            teammateRecord = newTeammate
            console.log('Created new teammate:', newTeammate.id)
          }
        }

        // Create job_teammate record
        const jobTeammateData = {
          job_id: jobId,
          teammate_email: teammate.email,
          teammate_name: teammate.name,
          invitation_status: 'pending'
        }

        // Add teammate_id if we have a teammate record
        if (teammateRecord?.id) {
          jobTeammateData.teammate_id = teammateRecord.id
        }

        const { data: jobTeammate, error: jobTeammateError } = await supabaseClient
          .from('job_teammates')
          .insert(jobTeammateData)
          .select()
          .single()

        if (jobTeammateError) {
          console.error('Error creating job teammate:', jobTeammateError)
          results.push({
            email: teammate.email,
            success: false,
            error: jobTeammateError.message
          })
        } else {
          console.log('Successfully assigned teammate to job:', jobTeammate.id)
          results.push({
            email: teammate.email,
            success: true,
            jobTeammateId: jobTeammate.id
          })
        }

      } catch (error) {
        console.error('Error processing teammate:', error)
        results.push({
          email: teammate.email,
          success: false,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Processed ${teammates.length} teammates for job ${jobId}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in invite-teammate-to-job:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
