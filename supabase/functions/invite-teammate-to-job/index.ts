
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
      date: job.date,
      start_time: job.start_time,
      end_time: job.end_time,
      is_full_day: job.is_full_day,
      timezone: job.timezone
    })

    // Get the authenticated user's calendar integration
    console.log(`Looking for calendar integration for authenticated user: ${user.id}`)
    
    let { data: integration, error: integrationError } = await supabaseClient
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
        expiresAt: integration.expires_at,
        accessTokenLength: integration.access_token?.length || 0
      })

      // Check if token is expired and refresh if needed
      const now = new Date()
      const expiresAt = new Date(integration.expires_at)
      console.log('Token expiry check:', {
        now: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isExpired: now >= expiresAt
      })

      if (now >= expiresAt) {
        console.log('Token expired, refreshing...')
        
        try {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
              client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
              refresh_token: integration.refresh_token ?? '',
              grant_type: 'refresh_token',
            }),
          })

          if (!refreshResponse.ok) {
            const errorText = await refreshResponse.text()
            console.error('Token refresh failed:', errorText)
            throw new Error(`Token refresh failed: ${refreshResponse.status}`)
          }

          const tokenData = await refreshResponse.json()
          console.log('Token refreshed successfully')

          // Update the integration with new token
          const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
          
          const { data: updatedIntegration, error: updateError } = await supabaseClient
            .from('user_integrations')
            .update({
              access_token: tokenData.access_token,
              expires_at: newExpiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', integration.id)
            .select()
            .single()

          if (updateError) {
            console.error('Failed to update integration:', updateError)
            throw new Error('Failed to update token in database')
          }

          integration = updatedIntegration
          console.log('Integration updated with new token, expires at:', newExpiresAt)

        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError)
          // Don't fail the whole operation, just skip calendar invites
          integration = null
        }
      }
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
              hasToken: !!integration.access_token,
              tokenLength: integration.access_token?.length || 0
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

            // Set date/time with proper RFC3339 formatting for Google Calendar
            if (job.is_full_day) {
              eventData.start = { date: job.date }
              eventData.end = { date: job.date }
              console.log('Creating full-day event for date:', job.date)
            } else {
              // Use job timezone or fallback to provided timezone or UTC
              const eventTimezone = job.timezone || timeZone || 'UTC'
              console.log('Event timezone determined as:', eventTimezone)
              
              // Format as RFC3339 with timezone offset
              const startTime = job.start_time || '09:00:00'
              const endTime = job.end_time || '17:00:00'
              
              // Create proper ISO datetime strings with timezone
              const startDateTime = `${job.date}T${startTime}`
              const endDateTime = `${job.date}T${endTime}`
              
              console.log('Raw datetime strings:', {
                startDateTime,
                endDateTime,
                timezone: eventTimezone
              })
              
              eventData.start = {
                dateTime: startDateTime,
                timeZone: eventTimezone
              }
              eventData.end = {
                dateTime: endDateTime,
                timeZone: eventTimezone
              }
              
              console.log('Final event timing:', {
                start: eventData.start,
                end: eventData.end
              })
            }

            console.log('Complete event data being sent to Google Calendar:', JSON.stringify(eventData, null, 2))

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
            console.log('Google Calendar API response headers:', Object.fromEntries(calendarResponse.headers.entries()))
            
            const responseText = await calendarResponse.text()
            console.log('Google Calendar API response body:', responseText)

            if (calendarResponse.ok) {
              const eventResult = JSON.parse(responseText)
              calendarEventId = eventResult.id
              console.log('Calendar event created successfully with ID:', calendarEventId)

              // Update job teammate record with calendar event ID
              const { error: updateError } = await supabaseClient
                .from('job_teammates')
                .update({ 
                  calendar_event_id: calendarEventId,
                  invitation_status: 'sent',
                  invited_at: new Date().toISOString()
                })
                .eq('id', jobTeammate.id)

              if (updateError) {
                console.error('Failed to update job teammate with calendar event ID:', updateError)
              } else {
                console.log('Successfully updated job teammate record with calendar event ID')
              }

            } else {
              console.error('Calendar API error details:', {
                status: calendarResponse.status,
                statusText: calendarResponse.statusText,
                headers: Object.fromEntries(calendarResponse.headers.entries()),
                body: responseText
              })
              
              // Try to parse error response
              try {
                const errorData = JSON.parse(responseText)
                console.error('Parsed calendar API error:', errorData)
              } catch (parseError) {
                console.error('Could not parse calendar API error response')
              }
            }

          } catch (calendarError) {
            console.error('Error sending calendar invitation:', calendarError)
            console.error('Calendar error stack:', calendarError.stack)
            // Don't fail the whole operation if calendar fails
          }
        } else {
          console.log('Skipping calendar invitation because:', {
            hasIntegration: !!integration,
            hasJobDate: !!job.date,
            jobDate: job.date,
            authenticatedUserId: user.id,
            integrationUserId: integration?.user_id
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
        console.error('Teammate processing error stack:', error.stack)
        results.push({
          email: teammate.email,
          success: false,
          error: error.message
        })
      }
    }

    console.log('Final results:', results)

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
    console.error('Main error stack:', error.stack)
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
