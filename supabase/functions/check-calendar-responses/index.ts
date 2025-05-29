
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

    const { jobId } = await req.json()

    console.log('Checking calendar responses for job:', jobId)

    // Get all job teammates for this job
    const { data: jobTeammates, error: teammatesError } = await supabaseClient
      .from('job_teammates')
      .select('*')
      .eq('job_id', jobId)
      .not('calendar_event_id', 'is', null)

    if (teammatesError) {
      console.error('Error fetching job teammates:', teammatesError)
      throw new Error('Failed to fetch job teammates')
    }

    if (!jobTeammates || jobTeammates.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No teammates with calendar events found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user who created the job (to use their calendar integration)
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*, companies(user_id)')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Error fetching job:', jobError)
      throw new Error('Job not found')
    }

    const userId = job.companies?.user_id
    if (!userId) {
      throw new Error('Job owner not found')
    }

    // Get calendar integration for the user
    const { data: integration, error: integrationError } = await supabaseClient
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google_calendar')
      .single()

    if (integrationError || !integration) {
      console.error('No calendar integration found:', integrationError)
      throw new Error('No calendar integration found')
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(integration.expires_at)
    
    if (now >= expiresAt) {
      console.error('Access token expired')
      throw new Error('Calendar access token expired')
    }

    const results = []

    // Check each calendar event
    for (const teammate of jobTeammates) {
      try {
        console.log(`Checking calendar event ${teammate.calendar_event_id} for ${teammate.teammate_email}`)

        // Get event details from Google Calendar
        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${teammate.calendar_event_id}`,
          {
            headers: {
              'Authorization': `Bearer ${integration.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!calendarResponse.ok) {
          console.error(`Calendar API error for event ${teammate.calendar_event_id}:`, await calendarResponse.text())
          continue
        }

        const eventData = await calendarResponse.json()
        console.log(`Event data for ${teammate.teammate_email}:`, JSON.stringify(eventData.attendees))

        // Find the attendee in the event
        const attendee = eventData.attendees?.find((att: any) => 
          att.email.toLowerCase() === teammate.teammate_email.toLowerCase()
        )

        if (attendee) {
          let newStatus = 'pending'
          
          switch (attendee.responseStatus) {
            case 'accepted':
              newStatus = 'accepted'
              break
            case 'declined':
              newStatus = 'declined'
              break
            case 'tentative':
              newStatus = 'pending'
              break
            case 'needsAction':
              newStatus = 'sent'
              break
            default:
              newStatus = 'sent'
          }

          console.log(`Updating status for ${teammate.teammate_email} from ${teammate.invitation_status} to ${newStatus}`)

          // Update the job teammate status if it changed
          if (newStatus !== teammate.invitation_status) {
            const { error: updateError } = await supabaseClient
              .from('job_teammates')
              .update({
                invitation_status: newStatus,
                responded_at: newStatus !== 'sent' && newStatus !== 'pending' ? new Date().toISOString() : null
              })
              .eq('id', teammate.id)

            if (updateError) {
              console.error('Error updating job teammate status:', updateError)
            } else {
              console.log(`Successfully updated status for ${teammate.teammate_email} to ${newStatus}`)
            }
          }

          results.push({
            teammateId: teammate.id,
            email: teammate.teammate_email,
            oldStatus: teammate.invitation_status,
            newStatus: newStatus,
            updated: newStatus !== teammate.invitation_status
          })
        } else {
          console.log(`Attendee ${teammate.teammate_email} not found in event ${teammate.calendar_event_id}`)
          results.push({
            teammateId: teammate.id,
            email: teammate.teammate_email,
            error: 'Attendee not found in calendar event'
          })
        }
      } catch (error) {
        console.error(`Error checking calendar for ${teammate.teammate_email}:`, error)
        results.push({
          teammateId: teammate.id,
          email: teammate.teammate_email,
          error: error.message
        })
      }
    }

    console.log('Calendar response check results:', results)

    return new Response(
      JSON.stringify({ 
        success: true,
        results: results,
        message: 'Calendar responses checked successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in check-calendar-responses:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
