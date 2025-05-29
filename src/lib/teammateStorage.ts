
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
  timeZone?: string
): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('invite-teammate-to-job', {
    body: {
      jobId,
      teammates,
      timeZone
    }
  });

  if (error) {
    console.error('Error inviting teammates:', error);
    throw error;
  }

  return data;
};

export const removeTeammateFromJob = async (jobTeammateId: string): Promise<void> => {
  const { error } = await supabase
    .from('job_teammates')
    .delete()
    .eq('id', jobTeammateId);

  if (error) {
    console.error('Error removing teammate from job:', error);
    throw error;
  }
};
