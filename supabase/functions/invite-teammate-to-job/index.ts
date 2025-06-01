
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const refreshAccessToken = async (refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh token:', await response.text())
      return null
    }

    const data = await response.json()
    return {
      access_token: data.access_token,
      expires_in: data.expires_in
    }
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

const formatToRFC3339 = (date: string, time: string, timezone: string): string => {
  console.log(`formatToRFC3339 inputs: { date: "${date}", time: "${time}", timezone: "${timezone}" }`)
  
  // Create the datetime string in the specified timezone format
  const datetimeString = `${date}T${time}:00`
  console.log(`Initial datetime string: ${datetimeString}`)
  
  // For Google Calendar API, we need to format it properly with timezone
  // Use the timezone directly in the format that Google Calendar expects
  const rfc3339 = `${datetimeString}`
  console.log(`Final RFC3339 datetime for timezone ${timezone}: ${rfc3339}`)
  
  return rfc3339
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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log(`Authenticated user ID: ${user.id}`)

    const { jobId, teammates, timeZone } = await req.json()
    console.log(`Inviting teammates to job: {
  jobId: "${jobId}",
  teammates: ${teammates.length},
  timeZone: "${timeZone}",
  authenticatedUserId: "${user.id}"
}`)

    // Get job details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select(`
        *,
        clients(name, email, phone)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error('Job not found')
    }

    console.log(`Found job: ${job.title}`)
    console.log(`Job details: {
  id: "${job.id}",
  title: "${job.title}",
  client_id: "${job.client_id}",
  company_id: "${job.company_id}",
  user_id: ${job.user_id},
  date: "${job.date}",
  start_time: "${job.start_time}",
  end_time: "${job.end_time}",
  is_full_day: ${job.is_full_day},
  timezone: "${job.timezone}"
}`)

    // Get calendar integration
    console.log(`Looking for calendar integration for authenticated user: ${user.id}`)
    
    const { data: integration, error: integrationError } = await supabaseClient
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single()

    if (integrationError || !integration) {
      throw new Error('No calendar integration found')
    }

    console.log(`Found calendar integration for user ${user.id}: {
  id: "${integration.id}",
  provider: "${integration.provider}",
  hasAccessToken: ${!!integration.access_token},
  expiresAt: "${integration.expires_at}",
  accessTokenLength: ${integration.access_token?.length || 0}
}`)

    let accessToken = integration.access_token
    
    // Check if token is expired and refresh if needed
    const now = new Date()
    const expiresAt = new Date(integration.expires_at)
    
    console.log(`Token expiry check: {
  now: "${now.toISOString()}",
  expiresAt: "${expiresAt.toISOString()}",
  isExpired: ${now >= expiresAt}
}`)
    
    if (now >= expiresAt) {
      console.log('Access token expired, attempting to refresh...')
      
      if (!integration.refresh_token) {
        throw new Error('No refresh token available')
      }
      
      const refreshResult = await refreshAccessToken(integration.refresh_token)
      if (!refreshResult) {
        throw new Error('Failed to refresh access token')
      }
      
      // Update the integration with new token
      const newExpiresAt = new Date(now.getTime() + (refreshResult.expires_in * 1000))
      
      const { error: updateError } = await supabaseClient
        .from('user_integrations')
        .update({
          access_token: refreshResult.access_token,
          expires_at: newExpiresAt.toISOString()
        })
        .eq('id', integration.id)
      
      if (updateError) {
        console.error('Error updating integration:', updateError)
        throw new Error('Failed to update token')
      }
      
      accessToken = refreshResult.access_token
      console.log('Successfully refreshed access token')
    }

    console.log(`Using calendar integration: {
  userId: "${user.id}",
  provider: "${integration.provider}",
  hasToken: ${!!accessToken},
  tokenLength: ${accessToken?.length || 0}
}`)

    const results = []

    // First, create all job teammate records
    for (const teammate of teammates) {
      console.log(`Processing teammate: ${teammate.email}`)

      // Check if teammate exists in the teammates table
      let teammateId = teammate.id
      if (!teammateId) {
        // Create new teammate if doesn't exist
        const { data: newTeammate, error: createTeammateError } = await supabaseClient
          .from('teammates')
          .insert({
            user_id: user.id,
            company_id: job.company_id,
            name: teammate.name,
            email: teammate.email
          })
          .select('id')
          .single()

        if (createTeammateError) {
          console.error('Error creating teammate:', createTeammateError)
          results.push({
            email: teammate.email,
            success: false,
            error: 'Failed to create teammate record'
          })
          continue
        }

        teammateId = newTeammate.id
        console.log(`Created new teammate: ${teammateId}`)
      }

      // Create job_teammate record
      const { data: jobTeammate, error: jobTeammateError } = await supabaseClient
        .from('job_teammates')
        .insert({
          job_id: jobId,
          teammate_id: teammateId,
          teammate_name: teammate.name,
          teammate_email: teammate.email,
          invitation_status: 'sent',
          invited_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (jobTeammateError) {
        console.error('Error creating job teammate:', jobTeammateError)
        results.push({
          email: teammate.email,
          success: false,
          error: 'Failed to assign teammate to job'
        })
        continue
      }

      console.log(`Successfully assigned teammate to job: ${jobTeammate.id}`)
      
      results.push({
        email: teammate.email,
        success: true,
        jobTeammateId: jobTeammate.id
      })
    }

    // Now create a single calendar event with all teammates as attendees
    if (job.date && accessToken && results.some(r => r.success)) {
      console.log(`Creating single calendar event for all teammates`)

      const eventTimezone = job.timezone || timeZone || 'UTC'
      console.log(`Event timezone determined as: ${eventTimezone}`)

      const startTime = job.start_time || '09:00'
      const endTime = job.end_time || '17:00'

      console.log(`Raw datetime inputs: {
  date: "${job.date}",
  startTime: "${startTime}",
  endTime: "${endTime}",
  timezone: "${eventTimezone}"
}`)

      const startDateTime = formatToRFC3339(job.date, startTime, eventTimezone)
      const endDateTime = formatToRFC3339(job.date, endTime, eventTimezone)

      console.log(`Formatted datetimes: {
  start: "${startDateTime}",
  end: "${endDateTime}"
}`)

      // Create attendees array for all successfully added teammates
      const attendees = results
        .filter(r => r.success)
        .map(r => ({ email: r.email }))

      const eventData = {
        summary: `${job.title} - ${job.clients.name}`,
        description: `Job: ${job.title}\nDate: ${job.date}\nClient: ${job.clients.name}\n\n${job.description || ''}\n\nClient Contact:\nEmail: ${job.clients.email}\nPhone: ${job.clients.phone}`,
        location: job.location || '',
        attendees: attendees,
        start: {
          dateTime: startDateTime,
          timeZone: eventTimezone
        },
        end: {
          dateTime: endDateTime,
          timeZone: eventTimezone
        }
      }

      console.log(`Complete event data being sent to Google Calendar: ${JSON.stringify(eventData, null, 2)}`)

      try {
        // Use the user's selected calendar from integration, or primary as fallback
        const targetCalendarId = integration.calendar_id || 'primary'
        console.log(`Creating event in calendar: ${targetCalendarId}`)

        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
          }
        )

        console.log(`Google Calendar API response status: ${calendarResponse.status}`)
        console.log(`Google Calendar API response headers: ${JSON.stringify(Object.fromEntries(calendarResponse.headers), null, 2)}`)

        const calendarResponseBody = await calendarResponse.text()
        console.log(`Google Calendar API response body: ${calendarResponseBody}`)

        if (!calendarResponse.ok) {
          throw new Error(`Calendar API error: ${calendarResponseBody}`)
        }

        const calendarData = JSON.parse(calendarResponseBody)
        const eventId = calendarData.id

        console.log(`Calendar event created successfully with ID: ${eventId}`)

        // Update all successful job_teammate records with the same calendar event ID
        for (const result of results) {
          if (result.success && result.jobTeammateId) {
            const { error: updateError } = await supabaseClient
              .from('job_teammates')
              .update({
                calendar_event_id: eventId,
                invitation_status: 'sent'
              })
              .eq('id', result.jobTeammateId)

            if (updateError) {
              console.error('Error updating job teammate with calendar event ID:', updateError)
            } else {
              console.log(`Successfully updated job teammate record with calendar event ID`)
              result.calendarEventId = eventId
            }
          }
        }

        // Also update the job record with the calendar event ID and store which calendar was used
        await supabaseClient
          .from('jobs')
          .update({ 
            calendar_event_id: eventId,
            calendar_id: targetCalendarId 
          })
          .eq('id', jobId)

      } catch (calendarError) {
        console.error('Error creating calendar event:', calendarError)
        // Don't fail the entire operation if calendar creation fails
        for (const result of results) {
          if (result.success) {
            result.calendarError = calendarError.message
          }
        }
      }
    }

    console.log(`Final results: ${JSON.stringify(results, null, 2)}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        results: results,
        message: 'Teammates invited successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in invite-teammate-to-job:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
