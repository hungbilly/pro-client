
import { Client, Job as JobType, Invoice, InvoiceItem, PaymentSchedule } from '@/types';
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
    
    // Map snake_case database columns to camelCase TypeScript interface
    return data?.map(client => ({
      id: client.id,
      companyId: client.company_id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      createdAt: client.created_at,
    })) || [];
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
    
    if (!data) return null;
    
    // Map snake_case database columns to camelCase TypeScript interface
    return {
      id: data.id,
      companyId: data.company_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      createdAt: data.created_at,
    };
  } catch (error) {
    logError(`Failed to fetch client with ID ${id}:`, error);
    return null;
  }
};

export const saveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client | null> => {
  try {
    // Map camelCase TypeScript interface to snake_case database columns
    const dbData = {
      company_id: clientData.companyId,
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone,
      address: clientData.address,
      notes: clientData.notes,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('clients')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      logError('Error saving client:', error);
      throw error;
    }

    logDebug('Saved client:', data);
    
    // Map back to TypeScript interface
    return {
      id: data.id,
      companyId: data.company_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      createdAt: data.created_at,
    };
  } catch (error) {
    logError('Failed to save client:', error);
    return null;
  }
};

export const updateClient = async (client: Client): Promise<void> => {
  try {
    // Map camelCase TypeScript interface to snake_case database columns
    const dbData = {
      company_id: client.companyId,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('clients')
      .update(dbData)
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

export const getJobs = async (companyId: string): Promise<JobType[]> => {
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
    
    // Map snake_case database columns to camelCase TypeScript interface
    return data?.map(job => ({
      id: job.id,
      clientId: job.client_id,
      companyId: job.company_id,
      title: job.title,
      description: job.description,
      status: job.status as JobType['status'],
      date: job.date,
      location: job.location,
      startTime: job.start_time,
      endTime: job.end_time,
      isFullDay: job.is_full_day,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      calendarEventId: job.calendar_event_id
    })) || [];
  } catch (error) {
    logError('Failed to fetch jobs:', error);
    return [];
  }
};

export const getJob = async (id: string): Promise<JobType | null> => {
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
    
    if (!data) return null;
    
    // Map snake_case database columns to camelCase TypeScript interface
    return {
      id: data.id,
      clientId: data.client_id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      status: data.status as JobType['status'],
      date: data.date,
      location: data.location,
      startTime: data.start_time,
      endTime: data.end_time,
      isFullDay: data.is_full_day,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      calendarEventId: data.calendar_event_id
    };
  } catch (error) {
    logError(`Failed to fetch job with ID ${id}:`, error);
    return null;
  }
};

export const saveJob = async (jobData: Omit<JobType, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobType | null> => {
  try {
    // Map camelCase TypeScript interface to snake_case database columns
    const dbData = {
      client_id: jobData.clientId,
      company_id: jobData.companyId,
      title: jobData.title,
      description: jobData.description,
      status: jobData.status,
      date: jobData.date,
      location: jobData.location,
      start_time: jobData.startTime,
      end_time: jobData.endTime,
      is_full_day: jobData.isFullDay,
      calendar_event_id: jobData.calendarEventId,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('jobs')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      logError('Error saving job:', error);
      throw error;
    }

    logDebug('Saved job:', data);
    
    // Map back to TypeScript interface
    return {
      id: data.id,
      clientId: data.client_id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      status: data.status as JobType['status'],
      date: data.date,
      location: data.location,
      startTime: data.start_time,
      endTime: data.end_time,
      isFullDay: data.is_full_day,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      calendarEventId: data.calendar_event_id
    };
  } catch (error) {
    logError('Failed to save job:', error);
    return null;
  }
};

export const updateJob = async (job: JobType): Promise<void> => {
  try {
    // Map camelCase TypeScript interface to snake_case database columns
    const dbData = {
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
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('jobs')
      .update(dbData)
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

// Add the missing invoice-related functions
export const getInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError) {
      logError(`Error fetching invoice with ID ${id}:`, invoiceError);
      throw invoiceError;
    }

    if (!invoiceData) return null;

    // Get invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      logError(`Error fetching items for invoice ID ${id}:`, itemsError);
      throw itemsError;
    }

    // Get payment schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', id);

    if (schedulesError) {
      logError(`Error fetching payment schedules for invoice ID ${id}:`, schedulesError);
      throw schedulesError;
    }

    // Map snake_case database columns to camelCase TypeScript interface
    const invoice: Invoice = {
      id: invoiceData.id,
      clientId: invoiceData.client_id,
      companyId: invoiceData.company_id,
      jobId: invoiceData.job_id,
      number: invoiceData.number,
      issueDate: invoiceData.date,
      date: invoiceData.date,
      dueDate: invoiceData.due_date,
      status: invoiceData.status,
      totalAmount: invoiceData.amount,
      amount: invoiceData.amount,
      notes: invoiceData.notes,
      contractTerms: invoiceData.contract_terms,
      contractStatus: invoiceData.contract_status as 'pending' | 'accepted',
      viewLink: invoiceData.view_link,
      shootingDate: invoiceData.shooting_date,
      pdfUrl: invoiceData.pdf_url
    };

    // Map invoice items
    if (itemsData && itemsData.length > 0) {
      const items: InvoiceItem[] = itemsData.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      }));
      invoice.items = items;
    } else {
      invoice.items = [];
    }

    // Map payment schedules
    if (schedulesData && schedulesData.length > 0) {
      const schedules: PaymentSchedule[] = schedulesData.map(schedule => ({
        id: schedule.id,
        description: schedule.description || '',
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        status: schedule.status as PaymentStatus,
        paymentDate: schedule.payment_date
      }));
      invoice.paymentSchedules = schedules;
    }

    return invoice;
  } catch (error) {
    logError(`Failed to fetch invoice with ID ${id}:`, error);
    return null;
  }
};

export const getInvoicesByDate = async (dateFilter?: string): Promise<Invoice[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('date', { ascending: false });
    
    if (dateFilter) {
      query = query.eq('date', dateFilter);
    }
    
    const { data, error } = await query;

    if (error) {
      logError('Error fetching invoices:', error);
      throw error;
    }

    // Map to Invoice interface
    const invoices: Invoice[] = data.map(invoice => ({
      id: invoice.id,
      clientId: invoice.client_id,
      companyId: invoice.company_id,
      jobId: invoice.job_id,
      number: invoice.number,
      issueDate: invoice.date,
      date: invoice.date,
      dueDate: invoice.due_date,
      status: invoice.status,
      totalAmount: invoice.amount,
      amount: invoice.amount,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      contractStatus: invoice.contract_status as 'pending' | 'accepted',
      viewLink: invoice.view_link,
      shootingDate: invoice.shooting_date,
      pdfUrl: invoice.pdf_url,
      items: []
    }));

    return invoices;
  } catch (error) {
    logError('Failed to fetch invoices:', error);
    return [];
  }
};

export const saveInvoice = async (invoiceData: Omit<Invoice, 'id' | 'viewLink'>): Promise<Invoice | null> => {
  try {
    // Map TypeScript interface to database columns
    const dbData = {
      client_id: invoiceData.clientId,
      company_id: invoiceData.companyId,
      job_id: invoiceData.jobId,
      number: invoiceData.number,
      date: invoiceData.date,
      due_date: invoiceData.dueDate,
      status: invoiceData.status,
      amount: invoiceData.amount || invoiceData.totalAmount,
      notes: invoiceData.notes,
      contract_terms: invoiceData.contractTerms,
      contract_status: invoiceData.contractStatus,
      shooting_date: invoiceData.shootingDate,
      view_link: `${window.location.origin}/invoice/view/${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    };

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([dbData])
      .select()
      .single();

    if (invoiceError) {
      logError('Error saving invoice:', invoiceError);
      throw invoiceError;
    }

    // Insert invoice items if present
    if (invoiceData.items && invoiceData.items.length > 0) {
      const items = invoiceData.items.map(item => ({
        invoice_id: invoice.id,
        name: item.name || item.productName,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items);

      if (itemsError) {
        logError('Error saving invoice items:', itemsError);
        throw itemsError;
      }
    }

    // Insert payment schedules if present
    if (invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0) {
      const schedules = invoiceData.paymentSchedules.map(schedule => ({
        invoice_id: invoice.id,
        description: schedule.description,
        due_date: schedule.dueDate,
        percentage: schedule.percentage,
        status: schedule.status,
        payment_date: schedule.paymentDate
      }));

      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(schedules);

      if (schedulesError) {
        logError('Error saving payment schedules:', schedulesError);
        throw schedulesError;
      }
    }

    // Return full invoice
    return await getInvoice(invoice.id);
  } catch (error) {
    logError('Failed to save invoice:', error);
    return null;
  }
};

export const updateInvoice = async (invoice: Invoice): Promise<Invoice | null> => {
  try {
    // Map TypeScript interface to database columns
    const dbData = {
      client_id: invoice.clientId,
      company_id: invoice.companyId,
      job_id: invoice.jobId,
      number: invoice.number,
      date: invoice.date,
      due_date: invoice.dueDate,
      status: invoice.status,
      amount: invoice.amount || invoice.totalAmount,
      notes: invoice.notes,
      contract_terms: invoice.contractTerms,
      contract_status: invoice.contractStatus,
      shooting_date: invoice.shootingDate,
      updated_at: new Date().toISOString()
    };

    // Update invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update(dbData)
      .eq('id', invoice.id);

    if (invoiceError) {
      logError(`Error updating invoice with ID ${invoice.id}:`, invoiceError);
      throw invoiceError;
    }

    // Update invoice items
    if (invoice.items && invoice.items.length > 0) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (deleteError) {
        logError(`Error deleting existing items for invoice ID ${invoice.id}:`, deleteError);
        throw deleteError;
      }

      // Insert new items
      const items = invoice.items.map(item => ({
        invoice_id: invoice.id,
        name: item.name || item.productName,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items);

      if (itemsError) {
        logError(`Error updating items for invoice ID ${invoice.id}:`, itemsError);
        throw itemsError;
      }
    }

    // Update payment schedules
    if (invoice.paymentSchedules && invoice.paymentSchedules.length > 0) {
      // Delete existing schedules
      const { error: deleteError } = await supabase
        .from('payment_schedules')
        .delete()
        .eq('invoice_id', invoice.id);

      if (deleteError) {
        logError(`Error deleting existing payment schedules for invoice ID ${invoice.id}:`, deleteError);
        throw deleteError;
      }

      // Insert new schedules
      const schedules = invoice.paymentSchedules.map(schedule => ({
        invoice_id: invoice.id,
        description: schedule.description,
        due_date: schedule.dueDate,
        percentage: schedule.percentage,
        status: schedule.status,
        payment_date: schedule.paymentDate
      }));

      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(schedules);

      if (schedulesError) {
        logError(`Error updating payment schedules for invoice ID ${invoice.id}:`, schedulesError);
        throw schedulesError;
      }
    }

    // Return updated invoice
    return await getInvoice(invoice.id);
  } catch (error) {
    logError(`Failed to update invoice with ID ${invoice.id}:`, error);
    return null;
  }
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  try {
    // Delete payment schedules first (foreign key constraint)
    const { error: schedulesError } = await supabase
      .from('payment_schedules')
      .delete()
      .eq('invoice_id', id);

    if (schedulesError) {
      logError(`Error deleting payment schedules for invoice ID ${id}:`, schedulesError);
      throw schedulesError;
    }

    // Delete invoice items (foreign key constraint)
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    if (itemsError) {
      logError(`Error deleting invoice items for invoice ID ${id}:`, itemsError);
      throw itemsError;
    }

    // Delete invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (invoiceError) {
      logError(`Error deleting invoice with ID ${id}:`, invoiceError);
      throw invoiceError;
    }

    logDebug(`Successfully deleted invoice with ID ${id}`);
    return true;
  } catch (error) {
    logError(`Failed to delete invoice with ID ${id}:`, error);
    return false;
  }
};
