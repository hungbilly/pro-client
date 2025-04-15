
export const deleteJob = async (jobId: string): Promise<boolean> => {
  try {
    console.log('Starting job deletion process for job ID:', jobId);
    
    // Get the job to check if it has a calendar event
    const job = await getJob(jobId);
    
    if (!job) {
      console.error('Job not found for deletion:', jobId);
      return false;
    }

    console.log('Found job for deletion:', {
      id: job.id,
      title: job.title,
      hasCalendarEvent: Boolean(job.calendarEventId),
      calendarEventId: job.calendarEventId
    });

    // Check if the job has a calendar event associated with it
    if (job.calendarEventId) {
      try {
        console.log('Job has calendar event, attempting to delete event ID:', job.calendarEventId);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No active user session found for calendar event deletion');
        } else {
          console.log('User session found, calling delete-calendar-event function');
          
          // Call the delete-calendar-event function
          const response = await supabase.functions.invoke('delete-calendar-event', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: {
              eventId: job.calendarEventId,
              jobId: job.id,
            },
          });
          
          console.log('Delete calendar event response:', response);
          
          if (response.error) {
            console.error('Error response from delete-calendar-event function:', response.error);
          } else {
            console.log('Successfully called delete-calendar-event function with response:', response.data);
          }
        }
      } catch (calendarError) {
        console.error('Error deleting calendar event:', calendarError);
        // Continue with job deletion even if calendar deletion fails
      }
    } else {
      console.log('Job does not have an associated calendar event');
    }

    // Delete the job from Supabase
    console.log('Proceeding to delete job from database');
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error deleting job from database:', error);
      return false;
    }

    console.log('Job successfully deleted from database');
    return true;
  } catch (error) {
    console.error('Error in deleteJob:', error);
    return false;
  }
};
