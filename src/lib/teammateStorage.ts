
import { supabase } from '@/integrations/supabase/client';
import { Teammate, JobTeammate } from '@/types/teammate';

export const getTeammates = async (companyId: string): Promise<Teammate[]> => {
  const { data, error } = await supabase
    .from('teammates')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) {
    console.error('Error fetching teammates:', error);
    throw error;
  }

  return data || [];
};

export const saveTeammate = async (teammate: Omit<Teammate, 'id' | 'created_at' | 'updated_at'>): Promise<Teammate> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('teammates')
    .insert({
      ...teammate,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving teammate:', error);
    throw error;
  }

  return data;
};

export const updateTeammate = async (id: string, teammate: Partial<Teammate>): Promise<Teammate> => {
  const { data, error } = await supabase
    .from('teammates')
    .update(teammate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating teammate:', error);
    throw error;
  }

  return data;
};

export const deleteTeammate = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('teammates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting teammate:', error);
    throw error;
  }
};

export const getJobTeammates = async (jobId: string): Promise<JobTeammate[]> => {
  const { data, error } = await supabase
    .from('job_teammates')
    .select(`
      *,
      teammates (*)
    `)
    .eq('job_id', jobId)
    .order('created_at');

  if (error) {
    console.error('Error fetching job teammates:', error);
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    invitation_status: item.invitation_status as 'pending' | 'sent' | 'accepted' | 'declined' | 'error'
  }));
};

export const inviteTeammatesToJob = async (
  jobId: string, 
  teammates: Array<{ id?: string; name: string; email: string }>,
  timeZone?: string,
  createCalendarEvent: boolean = true
): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('invite-teammate-to-job', {
    body: {
      jobId,
      teammates,
      timeZone,
      createCalendarEvent
    }
  });

  if (error) {
    console.error('Error inviting teammates:', error);
    throw error;
  }

  return data;
};

export const removeTeammateFromJob = async (jobTeammateId: string): Promise<void> => {
  console.log('🚀 removeTeammateFromJob called with ID:', jobTeammateId);
  
  // First, get the teammate record to check if they have a calendar event
  console.log('🔍 Fetching job teammate record...');
  const { data: jobTeammate, error: fetchError } = await supabase
    .from('job_teammates')
    .select('calendar_event_id, teammate_email')
    .eq('id', jobTeammateId)
    .single();

  if (fetchError) {
    console.error('❌ Error fetching job teammate:', fetchError);
    throw fetchError;
  }

  console.log('📋 Job teammate data:', {
    hasCalendarEvent: !!jobTeammate?.calendar_event_id,
    email: jobTeammate?.teammate_email,
    calendarEventId: jobTeammate?.calendar_event_id
  });

  // If the teammate has a calendar event, try to remove them from it
  if (jobTeammate?.calendar_event_id && jobTeammate?.teammate_email) {
    try {
      console.log('🔐 Getting current session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('⚠️ No active session found, skipping calendar removal');
      } else {
        console.log('✅ Active session found, proceeding with calendar removal');
        console.log(`🗑️ Attempting to remove ${jobTeammate.teammate_email} from calendar event ${jobTeammate.calendar_event_id}`);
        
        const requestBody = {
          jobTeammateId,
          calendarEventId: jobTeammate.calendar_event_id,
          teammateEmail: jobTeammate.teammate_email
        };
        
        console.log('📤 Calling edge function with body:', requestBody);
        
        const { data, error: calendarError } = await supabase.functions.invoke('remove-teammate-from-calendar', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: requestBody
        });

        console.log('📥 Edge function response:', { data, error: calendarError });

        if (calendarError) {
          console.error('❌ Error removing teammate from calendar:', calendarError);
          // Don't throw here - we still want to remove from database even if calendar removal fails
        } else if (data?.success) {
          console.log('✅ Successfully removed teammate from calendar event');
        } else {
          console.warn('⚠️ Unexpected response from calendar removal:', data);
        }
      }
    } catch (calendarError) {
      console.error('💥 Error during calendar removal:', calendarError);
      // Don't throw here - we still want to remove from database even if calendar removal fails
    }
  } else {
    console.log('ℹ️ No calendar event associated with this teammate, skipping calendar removal');
  }

  // Remove the teammate from the database
  console.log('🗑️ Removing teammate from database...');
  const { error } = await supabase
    .from('job_teammates')
    .delete()
    .eq('id', jobTeammateId);

  if (error) {
    console.error('❌ Error removing teammate from job:', error);
    throw error;
  }

  console.log('✅ Successfully removed teammate from database');
};
