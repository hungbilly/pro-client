
// Import only what's needed at the top
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Your function handler
serve(async (req) => {
  // Parse the request
  const { jobId } = await req.json();
  
  if (!jobId) {
    return new Response(
      JSON.stringify({ success: false, error: "Job ID is required" }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    );
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        date,
        start_time,
        end_time,
        is_full_day,
        location,
        description,
        clients ( name, email )
      `)
      .eq("id", jobId)
      .single();
    
    if (jobError) {
      console.error("Error fetching job:", jobError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch job: ${jobError.message}` }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!job) {
      return new Response(
        JSON.stringify({ success: false, error: "Job not found" }),
        { headers: { "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Google Calendar API integration
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    const calendarId = Deno.env.get("COMPANY_CALENDAR_ID");
    
    if (!googleApiKey || !calendarId) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Calendar configuration missing" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Create the event
    // For this version, just simulate success since we're not actually adding to calendar yet
    // We would normally implement Google Calendar API here

    // Update the job with the fake calendar event ID
    // Note: This will only work if calendar_event_id column exists
    try {
      const calendarEventId = `cal_${Math.random().toString(36).substring(2, 11)}`;
      
      // Try updating with calendar_event_id
      const { error: updateError } = await supabase
        .from("jobs")
        .update({ calendar_event_id: calendarEventId })
        .eq("id", jobId);
      
      if (updateError) {
        // If the column doesn't exist, just continue without updating
        console.warn("Could not update calendar_event_id, column might not exist:", updateError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          event: {
            id: calendarEventId,
            summary: job.title,
            description: job.description || "",
            location: job.location || "",
            start: {
              date: job.date,
              time: job.start_time
            },
            end: {
              date: job.date,
              time: job.end_time
            }
          }
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error updating job with calendar event:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update job with calendar event" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected error occurred" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
