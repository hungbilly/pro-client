import { Client, Job } from '@/types';
import { supabase, logError, logDebug } from '@/integrations/supabase/client';

export const getClients = async (companyId: string): Promise<Client[]> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) {
      logError('Error fetching clients:', error);
      throw error;
    }

    logDebug('Fetched clients:', data);
    return data || [];
  } catch (error) {
    logError('Failed to fetch clients:', error);
    return [];
  }
};

export const getClient = async (id: string): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logError(`Error fetching client with ID ${id}:`, error);
      throw error;
    }

    logDebug(`Fetched client with ID ${id}:`, data);
    return data;
  } catch (error) {
    logError(`Failed to fetch client with ID ${id}:`, error);
    return null;
  }
};

export const saveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([
        { ...clientData, created_at: new Date().toISOString() },
      ])
      .select()
      .single();

    if (error) {
      logError('Error saving client:', error);
      throw error;
    }

    logDebug('Saved client:', data);
    return data;
  } catch (error) {
    logError('Failed to save client:', error);
    return null;
  }
};

export const updateClient = async (client: Client): Promise<void> => {
  try {
    const { error } = await supabase
      .from('clients')
      .update({ ...client, updated_at: new Date().toISOString() })
      .eq('id', client.id);

    if (error) {
      logError(`Error updating client with ID ${client.id}:`, error);
      throw error;
    }

    logDebug(`Updated client with ID ${client.id}:`, client);
  } catch (error) {
    logError(`Failed to update client with ID ${client.id}:`, error);
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      logError(`Error deleting client with ID ${id}:`, error);
      throw error;
    }

    logDebug(`Deleted client with ID ${id}`);
  } catch (error) {
    logError(`Failed to delete client with ID ${id}:`, error);
  }
};

export const getJobs = async (companyId: string): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('Error fetching jobs:', error);
      throw error;
    }

    logDebug('Fetched jobs:', data);
    return data || [];
  } catch (error) {
    logError('Failed to fetch jobs:', error);
    return [];
  }
};

export const getJob = async (id: string): Promise<Job | null> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logError(`Error fetching job with ID ${id}:`, error);
      throw error;
    }

    logDebug(`Fetched job with ID ${id}:`, data);
    return data;
  } catch (error) {
    logError(`Failed to fetch job with ID ${id}:`, error);
    return null;
  }
};

// Update the Job type to include calendarEventId
export interface Job {
  id: string;
  clientId: string;
  companyId: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  date?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  isFullDay?: boolean;
  createdAt: string;
  updatedAt?: string;
  calendarEventId?: string; // Add this field for calendar integration
}

export const saveJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert([
        { ...jobData, created_at: new Date().toISOString() },
      ])
      .select()
      .single();

    if (error) {
      logError('Error saving job:', error);
      throw error;
    }

    logDebug('Saved job:', data);
    return data;
  } catch (error) {
    logError('Failed to save job:', error);
    return null;
  }
};

export const updateJob = async (job: Job): Promise<void> => {
  try {
    const { error } = await supabase
      .from('jobs')
      .update({ ...job, updated_at: new Date().toISOString() })
      .eq('id', job.id);

    if (error) {
      logError(`Error updating job with ID ${job.id}:`, error);
      throw error;
    }

    logDebug(`Updated job with ID ${job.id}:`, job);
  } catch (error) {
    logError(`Failed to update job with ID ${job.id}:`, error);
  }
};

// Add a function to delete calendar event when job is deleted
export const deleteJob = async (id: string): Promise<void> => {
  try {
    // Get the job to check if it has a calendar event
    const job = await getJob(id);
    
    // If job has a calendar event ID, delete it from calendar
    if (job?.calendarEventId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('delete-calendar-event', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: {
              eventId: job.calendarEventId,
              userId: session.user.id
            }
          });
        }
      } catch (calendarError) {
        console.error('Failed to delete calendar event:', calendarError);
        // Continue with job deletion even if calendar event deletion fails
      }
    }
    
    // Delete the job from the database
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteJob:', error);
    throw error;
  }
};
