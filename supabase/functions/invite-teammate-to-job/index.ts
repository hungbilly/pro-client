
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
    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create an authenticated client using the user's JWT
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message}`)
    }

    console.log('Authenticated user ID:', user.id)

    const { jobId, teammates, timeZone } = await req.json()

    console.log('Inviting teammates to job:', {
      jobId,
      teammates: teammates?.length || 0,
      timeZone,
      authenticatedUserId: user.id
    })

    // First, verify the job exists and get its details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select(`
        *,
        clients (*)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Job lookup error:', jobError)
      throw new Error(`Job not found: ${jobId}`)
    }

    console.log('Found job:', job.title)
    console.log('Job details:', {
      id: job.id,
      title: job.title,
      client_id: job.client_id,
      company_id: job.company_id,
      user_id: job.user_id,
      date: job.date
    })

    // Get the authenticated user's calendar integration
    console.log(`Looking for calendar integration for authenticated user: ${user.id}`)
    
    const { data: integration, error: integrationError } = await supabaseClient
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single()

    if (integration && !integrationError) {
      console.log(`Found calendar integration for user ${user.id}:`, {
        id: integration.id,
        provider: integration.provider,
        hasAccessToken: !!integration.access_token,
        expiresAt: integration.expires_at
      })
    } else {
      console.log(`No calendar integration found for user ${user.id}:`, integrationError)
    }

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
              user_id: user.id // Use the authenticated user's ID
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
          continue
        }

        console.log('Successfully assigned teammate to job:', jobTeammate.id)

        // Try to send calendar invitation if we have integration and job has a date
        let calendarEventId = null
        if (integration && job.date) {
          try {
            console.log('Attempting to send calendar invitation to:', teammate.email)
            console.log('Using calendar integration:', {
              userId: integration.user_id,
              provider: integration.provider,
              hasToken: !!integration.access_token
            })
            
            // Create calendar event data
            const eventData = {
              summary: `${job.title} - ${job.clients?.name || 'Client'}`,
              description: `Job: ${job.title}\nDate: ${job.date}\nClient: ${job.clients?.name || 'Unknown'}\n\n${job.description || ''}\n\nClient Contact:\nEmail: ${job.clients?.email || ''}\nPhone: ${job.clients?.phone || ''}`,
              location: job.location || '',
              attendees: [
                { email: teammate.email }
              ]
            }

            // Set date/time
            if (job.is_full_day) {
              eventData.start = { date: job.date }
              eventData.end = { date: job.date }
              console.log('Creating full-day event for date:', job.date)
            } else {
              const startDateTime = `${job.date}T${job.start_time || '09:00:00'}`
              const endDateTime = `${job.date}T${job.end_time || '17:00:00'}`
              
              eventData.start = {
                dateTime: startDateTime,
                timeZone: timeZone || job.timezone || 'UTC'
              }
              eventData.end = {
                dateTime: endDateTime,
                timeZone: timeZone || job.timezone || 'UTC'
              }
              console.log('Creating timed event:', {
                start: eventData.start,
                end: eventData.end
              })
            }

            console.log('Full event data being sent to Google Calendar:', JSON.stringify(eventData, null, 2))

            // Call Google Calendar API
            const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${integration.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventData)
            })

            console.log('Google Calendar API response status:', calendarResponse.status)
            const responseText = await calendarResponse.text()
            console.log('Google Calendar API response body:', responseText)

            if (calendarResponse.ok) {
              const eventResult = JSON.parse(responseText)
              calendarEventId = eventResult.id
              console.log('Calendar event created successfully:', calendarEventId)

              // Update job teammate record with calendar event ID
              await supabaseClient
                .from('job_teammates')
                .update({ 
                  calendar_event_id: calendarEventId,
                  invitation_status: 'sent',
                  invited_at: new Date().toISOString()
                })
                .eq('id', jobTeammate.id)

              console.log('Updated job teammate record with calendar event ID')

            } else {
              console.error('Calendar API error:', {
                status: calendarResponse.status,
                statusText: calendarResponse.statusText,
                body: responseText
              })
            }

          } catch (calendarError) {
            console.error('Error sending calendar invitation:', calendarError)
            // Don't fail the whole operation if calendar fails
          }
        } else {
          console.log('Skipping calendar invitation because:', {
            hasIntegration: !!integration,
            hasJobDate: !!job.date,
            jobDate: job.date,
            authenticatedUserId: user.id
          })
        }

        results.push({
          email: teammate.email,
          success: true,
          jobTeammateId: jobTeammate.id,
          calendarEventId: calendarEventId
        })

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
        message: `Processed ${teammates.length} teammates for job ${jobId}`,
        authenticatedUserId: user.id
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
