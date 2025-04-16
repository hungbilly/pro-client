import { Client, Company, Invoice, Job, Package } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

const STORAGE_KEYS = {
  CLIENTS: 'wedding-clients',
  INVOICES: 'wedding-invoices',
  JOBS: 'wedding-jobs'
};

const getUserAndSession = async () => {
  const { data: { user, session } } = await supabase.auth.getSession();
  return { user, session };
};

// Clients
export const getClients = async (companyId: string): Promise<Client[]> => {
  try {
    const { user, session } = await getUserAndSession();

    if (session) {
      let { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients from Supabase:', error);
        throw error;
      }

      return clients?.map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        createdAt: client.created_at,
        notes: client.notes,
        companyId: client.company_id
      })) || [];
    }

    // Fallback to local storage if not connected to Supabase
    const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return storedClients ? JSON.parse(storedClients) : [];
  } catch (error) {
    console.error('Error in getClients:', error);
    throw error;
  }
};

export const getClient = async (id: string): Promise<Client | null> => {
  try {
    const { user, session } = await getUserAndSession();

    if (session) {
      let { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching client from Supabase:', error);
        return null;
      }

      return client ? {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        createdAt: client.created_at,
        notes: client.notes,
        companyId: client.company_id
      } : null;
    }

    // Fallback to local storage if not connected to Supabase
    const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (storedClients) {
      const clients: Client[] = JSON.parse(storedClients);
      return clients.find((client) => client.id === id) || null;
    }
    return null;
  } catch (error) {
    console.error('Error in getClient:', error);
    return null;
  }
};

export const saveClient = async (clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
  try {
    const { user, session } = await getUserAndSession();
    if (!user) throw new Error('User not authenticated');

    const newClient: Client = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...clientData,
    };

    if (session) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            id: newClient.id,
            name: newClient.name,
            email: newClient.email,
            phone: newClient.phone,
            address: newClient.address,
            created_at: newClient.createdAt,
            notes: newClient.notes,
            company_id: newClient.companyId
          })
          .select('*')
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          createdAt: data.created_at,
          notes: data.notes,
          companyId: data.company_id
        };
      } catch (error) {
        console.error('Error saving client to Supabase:', error);
        throw error;
      }
    }

    // Fallback to local storage if not connected to Supabase
    const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const clients: Client[] = storedClients ? JSON.parse(storedClients) : [];
    clients.push(newClient);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    return newClient;
  } catch (error) {
    console.error('Error in saveClient:', error);
    throw error;
  }
};

export const updateClient = async (client: Client): Promise<Client> => {
  try {
    const { user, session } = await getUserAndSession();

    if (session) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .update({
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            notes: client.notes,
            company_id: client.companyId
          })
          .eq('id', client.id)
          .select('*')
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          createdAt: data.created_at,
          notes: data.notes,
          companyId: data.company_id
        };
      } catch (error) {
        console.error('Error updating client in Supabase:', error);
        throw error;
      }
    }

    // Fallback to local storage if not connected to Supabase
    const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (storedClients) {
      let clients: Client[] = JSON.parse(storedClients);
      clients = clients.map((c) => (c.id === client.id ? client : c));
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
      return client;
    }

    throw new Error('Client not found in local storage');
  } catch (error) {
    console.error('Error in updateClient:', error);
    throw error;
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  try {
    const { user, session } = await getUserAndSession();

    if (session) {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting client from Supabase:', error);
        throw error;
      }
    }

    // Fallback to local storage if not connected to Supabase
    const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (storedClients) {
      let clients: Client[] = JSON.parse(storedClients);
      clients = clients.filter((client) => client.id !== id);
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    }
  } catch (error) {
    console.error('Error in deleteClient:', error);
    throw error;
  }
};

// Jobs
export const getJobs = async (companyId: string): Promise<Job[]> => {
  try {
    const { user, session } = await getUserAndSession();

    if (session) {
      let { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs from Supabase:', error);
        throw error;
      }

      return jobs?.map(job => ({
        id: job.id,
        clientId: job.client_id,
        companyId: job.company_id,
        title: job.title,
        description: job.description,
        status: job.status,
        date: job.date,
        location: job.location,
        startTime: job.start_time,
        endTime: job.end_time,
        isFullDay: job.is_full_day,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        calendarEventId: job.calendar_event_id,
        timezone: job.timezone
      })) || [];
    }

    // Fallback to local storage if not connected to Supabase
    const storedJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
    return storedJobs ? JSON.parse(storedJobs) : [];
  } catch (error) {
    console.error('Error in getJobs:', error);
    throw error;
  }
};

export const getJob = async (id: string): Promise<Job | null> => {
  try {
    const { user, session } = await getUserAndSession();

    if (session) {
      let { data: job, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching job from Supabase:', error);
        return null;
      }

      return job ? {
        id: job.id,
        clientId: job.client_id,
        companyId: job.company_id,
        title: job.title,
        description: job.description,
        status: job.status,
        date: job.date,
        location: job.location,
        startTime: job.start_time,
        endTime: job.end_time,
        isFullDay: job.is_full_day,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        calendarEventId: job.calendar_event_id,
        timezone: job.timezone
      } : null;
    }

    // Fallback to local storage if not connected to Supabase
    const storedJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (storedJobs) {
      const jobs: Job[] = JSON.parse(storedJobs);
      return jobs.find((job) => job.id === id) || null;
    }
    return null;
  } catch (error) {
    console.error('Error in getJob:', error);
    return null;
  }
};

export const saveJob = async (jobData: Partial<Job>): Promise<Job> => {
  try {
    const { user, session } = await getUserAndSession();
    if (!user) throw new Error('User not authenticated');

    // Ensure we have a timezone
    if (!jobData.timezone) {
      console.warn('No timezone provided for job, using browser timezone as fallback');
      jobData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } else {
      console.log('Using timezone from jobData:', jobData.timezone);
    }

    // If connected to Supabase, save to database
    if (session) {
      try {
        console.log('Saving job to Supabase with data:', jobData);
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            client_id: jobData.clientId,
            company_id: jobData.companyId,
            title: jobData.title,
            description: jobData.description,
            status: jobData.status || 'active',
            date: jobData.date,
            location: jobData.location,
            start_time: jobData.startTime,
            end_time: jobData.endTime,
            is_full_day: jobData.isFullDay,
            timezone: jobData.timezone,
            calendar_event_id: jobData.calendarEventId
          })
          .select('*')
          .single();

        if (error) throw error;

        console.log('Job saved to Supabase:', data);
        
        return {
          id: data.id,
          clientId: data.client_id,
          companyId: data.company_id,
          title: data.title,
          description: data.description,
          status: data.status,
          date: data.date,
          location: data.location,
          startTime: data.start_time,
          endTime: data.end_time,
          isFullDay: data.is_full_day,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          calendarEventId: data.calendar_event_id,
          timezone: data.timezone
        };
      } catch (error) {
        console.error('Error saving job to Supabase:', error);
        throw error;
      }
    }
    
    const newJob: Job = {
      id: uuidv4(),
      clientId: jobData.clientId!,
      companyId: jobData.companyId,
      title: jobData.title!,
      description: jobData.description,
      status: jobData.status || 'active',
      date: jobData.date,
      location: jobData.location,
      startTime: jobData.startTime,
      endTime: jobData.endTime,
      isFullDay: jobData.isFullDay,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calendarEventId: jobData.calendarEventId,
      timezone: jobData.timezone!
    };

    // Fallback to local storage if not connected to Supabase
    const storedJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
    const jobs: Job[] = storedJobs ? JSON.parse(storedJobs) : [];
    jobs.push(newJob);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    return newJob;
  } catch (error) {
    console.error('Error in saveJob:', error);
    throw error;
  }
};

export const updateJob = async (job: Job): Promise<Job> => {
  try {
    const { user, session } = await getUserAndSession();

    if (session) {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .update({
            client_id: job.clientId,
            company_id: job.companyId,
            title: job.title,
            description: job.description,
            status: job.status,
            date: job.date,
            location: job.location,
            start_time: job.startTime,
            end_time: job.endTime,
            is_full_day: job.isFullDay,
            calendar_event_id: job.calendarEventId,
            timezone: job.timezone
          })
          .eq('id', job.id)
          .select('*')
          .single();

        if (error) throw error;

        return {
          id: data.id,
          clientId: data.client_id,
          companyId: data.company_id,
          title: data.title,
          description: data.description,
          status: data.status,
          date: data.date,
          location: data.location,
          startTime: data.start_time,
          endTime: data.end_time,
          isFullDay: data.is_full_day,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          calendarEventId: data.calendar_event_id,
          timezone: data.timezone
        };
      } catch (error) {
        console.error('Error updating job in Supabase:', error);
        throw error;
      }
    }

    // Fallback to local storage if not connected to Supabase
    const storedJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (storedJobs) {
      let jobs: Job[] = JSON.parse(storedJobs);
      jobs = jobs.map((j) => (j.id === job.id ? job : j));
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
      return job;
    }

    throw new Error('Job not found in local storage');
  } catch (error) {
    console.error('Error in updateJob:', error);
    throw error;
  }
};

export const deleteJob = async (id: string): Promise<void> => {
  try {
    const { user, session } = await getUserAndSession();

    if (session) {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting job from Supabase:', error);
        throw error;
      }
    }

    // Fallback to local storage if not connected to Supabase
    const storedJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (storedJobs) {
      let jobs: Job[] = JSON.parse(storedJobs);
      jobs = jobs.filter((job) => job.id !== id);
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    }
  } catch (error) {
    console.error('Error in deleteJob:', error);
    throw error;
  }
};
