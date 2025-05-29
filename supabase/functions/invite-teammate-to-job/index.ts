
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { jobId, teammates, timeZone } = await req.json()

    console.log('Inviting teammates to job:', { jobId, teammates: teammates.length, timeZone })

    // Get job details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select(`
        *,
        clients (name, email),
        companies (name)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error('Job not found')
    }

    console.log('Job details:', { title: job.title, date: job.date, client: job.clients?.name })

    // Get user's Google Calendar integration
    const { data: integration } = await supabaseClient
      .from('user_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .single()

    if (!integration) {
      throw new Error('Google Calendar integration not found')
    }

    const results = []

    for (const teammate of teammates) {
      try {
        console.log('Processing teammate:', teammate.email)

        // Create calendar event with attendee
        const eventData = {
          summary: `${job.title} - ${job.clients?.name}`,
          description: `Photography job: ${job.title}\nClient: ${job.clients?.name}\nLocation: ${job.location || 'TBD'}`,
          location: job.location || '',
          start: job.is_full_day 
            ? { date: job.date }
            : {
                dateTime: `${job.date}T${job.start_time || '09:00'}:00`,
                timeZone: timeZone || 'UTC'
              },
          end: job.is_full_day
            ? { date: job.date }
            : {
                dateTime: `${job.date}T${job.end_time || '17:00'}:00`,
                timeZone: timeZone || 'UTC'
              },
          attendees: [
            {
              email: teammate.email,
              displayName: teammate.name,
              responseStatus: 'needsAction'
            }
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 30 }       // 30 minutes before
            ]
          },
          sendUpdates: 'all'
        }

        console.log('Creating calendar event with data:', eventData)

        const calendarResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
          }
        )

        if (!calendarResponse.ok) {
          const errorText = await calendarResponse.text()
          console.error('Calendar API error:', errorText)
          throw new Error(`Calendar API error: ${calendarResponse.status}`)
        }

        const calendarEvent = await calendarResponse.json()
        console.log('Calendar event created:', calendarEvent.id)

        // Save job teammate assignment
        const { data: jobTeammate, error: teammateError } = await supabaseClient
          .from('job_teammates')
          .insert({
            job_id: jobId,
            teammate_id: teammate.id || null,
            teammate_email: teammate.email,
            teammate_name: teammate.name,
            calendar_event_id: calendarEvent.id,
            invitation_status: 'sent',
            invited_at: new Date().toISOString()
          })
          .select()
          .single()

        if (teammateError) {
          console.error('Error saving job teammate:', teammateError)
          throw new Error('Failed to save teammate assignment')
        }

        results.push({
          success: true,
          teammate: teammate.email,
          calendarEventId: calendarEvent.id,
          jobTeammateId: jobTeammate.id
        })

      } catch (error) {
        console.error(`Error inviting teammate ${teammate.email}:`, error)
        
        // Still save the assignment even if calendar invite fails
        await supabaseClient
          .from('job_teammates')
          .insert({
            job_id: jobId,
            teammate_id: teammate.id || null,
            teammate_email: teammate.email,
            teammate_name: teammate.name,
            invitation_status: 'error',
            invited_at: new Date().toISOString()
          })

        results.push({
          success: false,
          teammate: teammate.email,
          error: error.message
        })
      }
    }

    console.log('Invitation results:', results)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Sent ${results.filter(r => r.success).length} of ${results.length} invitations`
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
