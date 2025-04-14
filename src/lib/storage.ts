import { Client, Job, Invoice, InvoiceItem, PaymentSchedule, InvoiceStatus, ContractStatus, PaymentStatus } from '@/types';
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
      updatedAt: client.updated_at || null
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
      updatedAt: data.updated_at || null
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
      updatedAt: data.updated_at
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
    
    // Map snake_case database columns to camelCase TypeScript interface
    return data?.map(job => ({
      id: job.id,
      clientId: job.client_id,
      companyId: job.company_id,
      title: job.title,
      description: job.description,
      status: job.status as Job['status'],
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
    
    if (!data) return null;
    
    // Map snake_case database columns to camelCase TypeScript interface
    return {
      id: data.id,
      clientId: data.client_id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      status: data.status as Job['status'],
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

export const saveJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job | null> => {
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
      status: data.status as Job['status'],
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

export const updateJob = async (job: Job): Promise<void> => {
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
      status: invoiceData.status as InvoiceStatus,
      totalAmount: invoiceData.amount,
      amount: invoiceData.amount,
      notes: invoiceData.notes,
      contractTerms: invoiceData.contract_terms,
      contractStatus: invoiceData.contract_status as ContractStatus,
      viewLink: invoiceData.view_link,
      shootingDate: invoiceData.shooting_date,
      pdfUrl: invoiceData.pdf_url,
      items: []
    };

    // Map invoice items
    if (itemsData && itemsData.length > 0) {
      const items: InvoiceItem[] = itemsData.map(item => ({
        id: item.id,
        name: item.name,
        productName: item.name,
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

export const getInvoices = async (companyId?: string): Promise<Invoice[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('date', { ascending: false });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;

    if (error) {
      logError('Error fetching invoices:', error);
      throw error;
    }

    // Map to Invoice interface with empty items array
    const invoices: Invoice[] = data.map(invoice => ({
      id: invoice.id,
      clientId: invoice.client_id,
      companyId: invoice.company_id,
      jobId: invoice.job_id,
      number: invoice.number,
      issueDate: invoice.date,
      date: invoice.date,
      dueDate: invoice.due_date,
      status: invoice.status as InvoiceStatus,
      totalAmount: invoice.amount,
      amount: invoice.amount,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      contractStatus: invoice.contract_status as ContractStatus,
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
      status: invoice.status as InvoiceStatus,
      totalAmount: invoice.amount,
      amount: invoice.amount,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      contractStatus: invoice.contract_status as ContractStatus,
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
      date: invoiceData.date || invoiceData.issueDate,
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
      date: invoice.date || invoice.issueDate,
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

export const getClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      logError(`Error fetching invoices for client ID ${clientId}:`, error);
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
      status: invoice.status as InvoiceStatus,
      totalAmount: invoice.amount,
      amount: invoice.amount,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      contractStatus: invoice.contract_status as ContractStatus,
      viewLink: invoice.view_link,
      shootingDate: invoice.shooting_date,
      pdfUrl: invoice.pdf_url,
      items: []
    }));

    return invoices;
  } catch (error) {
    logError(`Failed to fetch invoices for client ID ${clientId}:`, error);
    return [];
  }
};

export const getClientJobs = async (clientId: string): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      logError(`Error fetching jobs for client ID ${clientId}:`, error);
      throw error;
    }

    // Map snake_case database columns to camelCase TypeScript interface
    return data?.map(job => ({
      id: job.id,
      clientId: job.client_id,
      companyId: job.company_id,
      title: job.title,
      description: job.description,
      status: job.status as Job['status'],
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
    logError(`Failed to fetch jobs for client ID ${clientId}:`, error);
    return [];
  }
};

export const getJobInvoices = async (jobId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId)
      .order('date', { ascending: false });

    if (error) {
      logError(`Error fetching invoices for job ID ${jobId}:`, error);
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
      status: invoice.status as InvoiceStatus,
      totalAmount: invoice.amount,
      amount: invoice.amount,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      contractStatus: invoice.contract_status as ContractStatus,
      viewLink: invoice.view_link,
      shootingDate: invoice.shooting_date,
      pdfUrl: invoice.pdf_url,
      items: []
    }));

    return invoices;
  } catch (error) {
    logError(`Failed to fetch invoices for job ID ${jobId}:`, error);
    return [];
  }
};

export const getInvoiceByViewLink = async (viewLink: string): Promise<Invoice | null> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('view_link', viewLink)
      .single();
      
    if (error) {
      logError(`Error fetching invoice with view link ${viewLink}:`, error);
      throw error;
    }
    
    if (!data) return null;
    
    return await getInvoice(data.id);
  } catch (error) {
    logError(`Failed to fetch invoice with view link ${viewLink}:`, error);
    return null;
  }
};

export const updateInvoiceStatus = async (
  invoiceId: string, 
  newStatus: InvoiceStatus
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', invoiceId);
      
    if (error) {
      logError(`Error updating status for invoice ID ${invoiceId}:`, error);
      throw error;
    }
    
    return true;
  } catch (error) {
    logError(`Failed to update status for invoice ID ${invoiceId}:`, error);
    return false;
  }
};

export const updateContractStatus = async (
  invoiceId: string,
  newStatus: ContractStatus
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ contract_status: newStatus })
      .eq('id', invoiceId);
      
    if (error) {
      logError(`Error updating contract status for invoice ID ${invoiceId}:`, error);
      throw error;
    }
    
    return true;
  } catch (error) {
    logError(`Failed to update contract status for invoice ID ${invoiceId}:`, error);
    return false;
  }
};

export const updatePaymentScheduleStatus = async (
  scheduleId: string,
  newStatus: PaymentStatus,
  paymentDate?: string
): Promise<boolean> => {
  try {
    const updateData: { status: PaymentStatus; payment_date?: string } = { status: newStatus };
    
    if (newStatus === 'paid' && paymentDate) {
      updateData.payment_date = paymentDate;
    }
    
    const { error } = await supabase
      .from('payment_schedules')
      .update(updateData)
      .eq('id', scheduleId);
      
    if (error) {
      logError(`Error updating payment schedule ID ${scheduleId}:`, error);
      throw error;
    }
    
    return true;
  } catch (error) {
    logError(`Failed to update payment schedule ID ${scheduleId}:`, error);
    return false;
  }
};
