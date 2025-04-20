import { supabase } from '@/integrations/supabase/client';
import { Client, Invoice, InvoiceItem, Job, PaymentSchedule, InvoiceStatus, ContractStatus, PaymentStatus } from '@/types';
import { format } from 'date-fns';

// Job functions
export const getJob = async (jobId: string): Promise<Job | null> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job:', error);
      return null;
    }

    if (!data) return null;
    
    console.log('Retrieved job with timezone:', data.timezone);

    return {
      id: data.id,
      clientId: data.client_id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      status: data.status as 'active' | 'completed' | 'cancelled',
      date: data.date,
      location: data.location,
      startTime: data.start_time,
      endTime: data.end_time,
      isFullDay: data.is_full_day,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      calendarEventId: data.calendar_event_id,
      timezone: data.timezone // Include the timezone in the returned Job object
    };
  } catch (error) {
    console.error('Error in getJob:', error);
    return null;
  }
};

export const getJobs = async (companyId?: string): Promise<Job[]> => {
  try {
    let query = supabase
      .from('jobs')
      .select('*')
      .order('date', { ascending: false });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }

    return data.map(job => ({
      id: job.id,
      clientId: job.client_id,
      companyId: job.company_id,
      title: job.title,
      description: job.description,
      status: job.status as 'active' | 'completed' | 'cancelled',
      date: job.date,
      location: job.location,
      startTime: job.start_time,
      endTime: job.end_time,
      isFullDay: job.is_full_day,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      calendarEventId: job.calendar_event_id,
      timezone: job.timezone // Include the timezone
    }));
  } catch (error) {
    console.error('Error in getJobs:', error);
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
      console.error('Error fetching client jobs:', error);
      return [];
    }

    return data.map(job => ({
      id: job.id,
      clientId: job.client_id,
      companyId: job.company_id,
      title: job.title,
      description: job.description,
      status: job.status as 'active' | 'completed' | 'cancelled',
      date: job.date,
      location: job.location,
      startTime: job.start_time,
      endTime: job.end_time,
      isFullDay: job.is_full_day,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      calendarEventId: job.calendar_event_id,
      timezone: job.timezone // Include the timezone
    }));
  } catch (error) {
    console.error('Error in getClientJobs:', error);
    return [];
  }
};

export const saveJob = async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
  try {
    console.log('Saving job to database with data:', job);
    console.log('Job timezone being saved:', job.timezone);
    
    const { data, error } = await supabase
      .from('jobs')
      .insert({
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
        timezone: job.timezone // Ensure timezone is being saved
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving job:', error);
      throw new Error(error.message);
    }

    console.log('Job saved successfully with response:', data);

    return {
      id: data.id,
      clientId: data.client_id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      status: data.status as 'active' | 'completed' | 'cancelled',
      date: data.date,
      location: data.location,
      startTime: data.start_time,
      endTime: data.end_time,
      isFullDay: data.is_full_day,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      calendarEventId: data.calendar_event_id,
      timezone: data.timezone // Return the timezone from the response
    };
  } catch (error) {
    console.error('Error in saveJob:', error);
    throw error;
  }
};

export const updateJob = async (job: Job): Promise<Job> => {
  try {
    console.log('Updating job in database with data:', job);
    console.log('Job timezone being updated:', job.timezone);
    
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
        timezone: job.timezone, // Ensure timezone is being updated
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating job:', error);
      throw new Error(error.message);
    }

    console.log('Job updated successfully with response:', data);

    return {
      id: data.id,
      clientId: data.client_id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      status: data.status as 'active' | 'completed' | 'cancelled',
      date: data.date,
      location: data.location,
      startTime: data.start_time,
      endTime: data.end_time,
      isFullDay: data.is_full_day,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      calendarEventId: data.calendar_event_id,
      timezone: data.timezone // Return the timezone from the response
    };
  } catch (error) {
    console.error('Error in updateJob:', error);
    throw error;
  }
};

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

// Client functions
export const getClient = async (clientId: string): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      notes: data.notes || '',
      createdAt: data.created_at,
      companyId: data.company_id
    };
  } catch (error) {
    console.error('Error in getClient:', error);
    return null;
  }
};

export const getClients = async (companyId?: string): Promise<Client[]> => {
  try {
    let query = supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }

    return data.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || '',
      createdAt: client.created_at,
      companyId: client.company_id
    }));
  } catch (error) {
    console.error('Error in getClients:', error);
    return [];
  }
};

export const saveClient = async (client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
        company_id: client.companyId
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving client:', error);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      notes: data.notes || '',
      createdAt: data.created_at,
      companyId: data.company_id
    };
  } catch (error) {
    console.error('Error in saveClient:', error);
    throw error;
  }
};

export const updateClient = async (client: Client): Promise<Client> => {
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
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      notes: data.notes || '',
      createdAt: data.created_at,
      companyId: data.company_id
    };
  } catch (error) {
    console.error('Error in updateClient:', error);
    throw error;
  }
};

export const deleteClient = async (clientId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteClient:', error);
    return false;
  }
};

// Invoice functions
export const getInvoice = async (invoiceId: string): Promise<Invoice | null> => {
  try {
    // Get invoice data
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      return null;
    }

    if (!invoiceData) return null;

    // Get invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return null;
    }

    // Get payment schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
      return null;
    }

    const items: InvoiceItem[] = itemsData.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      name: item.name
    }));

    const paymentSchedules: PaymentSchedule[] = schedulesData.map(schedule => ({
      id: schedule.id,
      dueDate: schedule.due_date,
      percentage: schedule.percentage,
      description: schedule.description,
      status: schedule.status as PaymentStatus || 'unpaid',
      paymentDate: schedule.payment_date
    }));

    return {
      id: invoiceData.id,
      clientId: invoiceData.client_id,
      companyId: invoiceData.company_id,
      jobId: invoiceData.job_id,
      number: invoiceData.number,
      date: invoiceData.date,
      dueDate: invoiceData.due_date,
      amount: invoiceData.amount,
      status: invoiceData.status as InvoiceStatus,
      contractStatus: invoiceData.contract_status as ContractStatus,
      notes: invoiceData.notes,
      contractTerms: invoiceData.contract_terms,
      viewLink: invoiceData.view_link,
      shootingDate: invoiceData.shooting_date,
      items,
      paymentSchedules,
      pdfUrl: invoiceData.pdf_url
    };
  } catch (error) {
    console.error('Error in getInvoice:', error);
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
      console.error('Error fetching invoices:', error);
      return [];
    }

    const invoices: Invoice[] = [];

    for (const invoiceData of data) {
      // Get invoice items for each invoice
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      // Get payment schedules for each invoice
      const { data: schedulesData } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      const items: InvoiceItem[] = (itemsData || []).map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        name: item.name
      }));

      const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
        id: schedule.id,
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        description: schedule.description,
        status: schedule.status as PaymentStatus || 'unpaid',
        paymentDate: schedule.payment_date
      }));

      invoices.push({
        id: invoiceData.id,
        clientId: invoiceData.client_id,
        companyId: invoiceData.company_id,
        jobId: invoiceData.job_id,
        number: invoiceData.number,
        date: invoiceData.date,
        dueDate: invoiceData.due_date,
        amount: invoiceData.amount,
        status: invoiceData.status as InvoiceStatus,
        contractStatus: invoiceData.contract_status as ContractStatus,
        notes: invoiceData.notes,
        contractTerms: invoiceData.contract_terms,
        viewLink: invoiceData.view_link,
        shootingDate: invoiceData.shooting_date,
        items,
        paymentSchedules,
        pdfUrl: invoiceData.pdf_url
      });
    }

    return invoices;
  } catch (error) {
    console.error('Error in getInvoices:', error);
    return [];
  }
};

export const getInvoicesByDate = async (date?: string): Promise<Invoice[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select('*');
    
    if (date) {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices by date:', error);
      return [];
    }

    return data.map(invoice => ({
      id: invoice.id,
      clientId: invoice.client_id,
      companyId: invoice.company_id,
      jobId: invoice.job_id,
      number: invoice.number,
      date: invoice.date,
      dueDate: invoice.due_date,
      amount: invoice.amount,
      status: invoice.status as InvoiceStatus,
      contractStatus: invoice.contract_status as ContractStatus,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      shootingDate: invoice.shooting_date,
      items: [],
      paymentSchedules: []
    }));
  } catch (error) {
    console.error('Error in getInvoicesByDate:', error);
    return [];
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
      console.error('Error fetching client invoices:', error);
      return [];
    }

    const invoices: Invoice[] = [];

    for (const invoiceData of data) {
      // Get invoice items for each invoice
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      // Get payment schedules for each invoice
      const { data: schedulesData } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      const items: InvoiceItem[] = (itemsData || []).map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        name: item.name
      }));

      const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
        id: schedule.id,
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        description: schedule.description,
        status: schedule.status as PaymentStatus || 'unpaid',
        paymentDate: schedule.payment_date
      }));

      invoices.push({
        id: invoiceData.id,
        clientId: invoiceData.client_id,
        companyId: invoiceData.company_id,
        jobId: invoiceData.job_id,
        number: invoiceData.number,
        date: invoiceData.date,
        dueDate: invoiceData.due_date,
        amount: invoiceData.amount,
        status: invoiceData.status as InvoiceStatus,
        contractStatus: invoiceData.contract_status as ContractStatus,
        notes: invoiceData.notes,
        contractTerms: invoiceData.contract_terms,
        viewLink: invoiceData.view_link,
        shootingDate: invoiceData.shooting_date,
        items,
        paymentSchedules,
        pdfUrl: invoiceData.pdf_url
      });
    }

    return invoices;
  } catch (error) {
    console.error('Error in getClientInvoices:', error);
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
      console.error('Error fetching job invoices:', error);
      return [];
    }

    const invoices: Invoice[] = [];

    for (const invoiceData of data) {
      // Get invoice items for each invoice
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      // Get payment schedules for each invoice
      const { data: schedulesData } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      const items: InvoiceItem[] = (itemsData || []).map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        name: item.name
      }));

      const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
        id: schedule.id,
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        description: schedule.description,
        status: schedule.status as PaymentStatus || 'unpaid',
        paymentDate: schedule.payment_date
      }));

      invoices.push({
        id: invoiceData.id,
        clientId: invoiceData.client_id,
        companyId: invoiceData.company_id,
        jobId: invoiceData.job_id,
        number: invoiceData.number,
        date: invoiceData.date,
        dueDate: invoiceData.due_date,
        amount: invoiceData.amount,
        status: invoiceData.status as InvoiceStatus,
        contractStatus: invoiceData.contract_status as ContractStatus,
        notes: invoiceData.notes,
        contractTerms: invoiceData.contract_terms,
        viewLink: invoiceData.view_link,
        shootingDate: invoiceData.shooting_date,
        items,
        paymentSchedules,
        pdfUrl: invoiceData.pdf_url
      });
    }

    return invoices;
  } catch (error) {
    console.error('Error in getJobInvoices:', error);
    return [];
  }
};

export const getInvoiceByViewLink = async (viewLink: string): Promise<Invoice | null> => {
  try {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('view_link', viewLink)
      .single();

    if (invoiceError) {
      console.error('Error fetching invoice by view link:', invoiceError);
      return null;
    }

    if (!invoiceData) return null;

    // Get invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceData.id);

    if (itemsError) {
      console.error('Error fetching invoice items by view link:', itemsError);
      return null;
    }

    // Get payment schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', invoiceData.id);

    if (schedulesError) {
      console.error('Error fetching payment schedules by view link:', schedulesError);
      return null;
    }

    const items: InvoiceItem[] = itemsData.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      name: item.name
    }));

    const paymentSchedules: PaymentSchedule[] = schedulesData.map(schedule => ({
      id: schedule.id,
      dueDate: schedule.due_date,
      percentage: schedule.percentage,
      description: schedule.description,
      status: schedule.status as PaymentStatus || 'unpaid',
      paymentDate: schedule.payment_date
    }));

    return {
      id: invoiceData.id,
      clientId: invoiceData.client_id,
      companyId: invoiceData.company_id,
      jobId: invoiceData.job_id,
      number: invoiceData.number,
      date: invoiceData.date,
      dueDate: invoiceData.due_date,
      amount: invoiceData.amount,
      status: invoiceData.status as InvoiceStatus,
      contractStatus: invoiceData.contract_status as ContractStatus,
      notes: invoiceData.notes,
      contractTerms: invoiceData.contract_terms,
      viewLink: invoiceData.view_link,
      shootingDate: invoiceData.shooting_date,
      items,
      paymentSchedules,
      pdfUrl: invoiceData.pdf_url
    };
  } catch (error) {
    console.error('Error in getInvoiceByViewLink:', error);
    return null;
  }
};

export const saveInvoice = async (invoice: Omit<Invoice, 'id' | 'viewLink'>): Promise<Invoice> => {
  try {
    // Generate a view link
    const viewLink = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Insert invoice data
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        client_id: invoice.clientId,
        company_id: invoice.companyId,
        job_id: invoice.jobId,
        number: invoice.number,
        date: invoice.date,
        due_date: invoice.dueDate,
        amount: invoice.amount,
        status: invoice.status,
        contract_status: invoice.contractStatus,
        notes: invoice.notes,
        contract_terms: invoice.contractTerms,
        view_link: viewLink,
        shooting_date: invoice.shootingDate
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error saving invoice:', invoiceError);
      throw new Error(invoiceError.message);
    }

    // Insert invoice items
    if (invoice.items && invoice.items.length > 0) {
      const itemsToInsert = invoice.items.map(item => ({
        invoice_id: invoiceData.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        name: item.name
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error saving invoice items:', itemsError);
        // Delete the invoice if items failed to save
        await supabase.from('invoices').delete().eq('id', invoiceData.id);
        throw new Error(itemsError.message);
      }
    }

    // Insert payment schedules
    if (invoice.paymentSchedules && invoice.paymentSchedules.length > 0) {
      const schedulesToInsert = invoice.paymentSchedules.map(schedule => ({
        invoice_id: invoiceData.id,
        due_date: schedule.dueDate,
        percentage: schedule.percentage,
        description: schedule.description,
        status: schedule.status || 'unpaid',
        payment_date: schedule.paymentDate
      }));

      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(schedulesToInsert);

      if (schedulesError) {
        console.error('Error saving payment schedules:', schedulesError);
        // We don't delete the invoice here as items are already saved
        throw new Error(schedulesError.message);
      }
    }

    return {
      id: invoiceData.id,
      clientId: invoiceData.client_id,
      companyId: invoiceData.company_id,
      jobId: invoiceData.job_id,
      number: invoiceData.number,
      date: invoiceData.date,
      dueDate: invoiceData.due_date,
      amount: invoiceData.amount,
      status: invoiceData.status as InvoiceStatus,
      contractStatus: invoiceData.contract_status as ContractStatus,
      notes: invoiceData.notes,
      contractTerms: invoiceData.contract_terms,
      viewLink: invoiceData.view_link,
      shootingDate: invoiceData.shooting_date,
      items: invoice.items || [],
      paymentSchedules: invoice.paymentSchedules || [],
      pdfUrl: invoiceData.pdf_url
    };
  } catch (error) {
    console.error('Error in saveInvoice:', error);
    throw error;
  }
};

export const updateInvoice = async (invoice: Invoice): Promise<Invoice> => {
  try {
    // Update invoice data
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({
        client_id: invoice.clientId,
        company_id: invoice.companyId,
        job_id: invoice.jobId,
        number: invoice.number,
        date: invoice.date,
        due_date: invoice.dueDate,
        amount: invoice.amount,
        status: invoice.status,
        contract_status: invoice.contractStatus,
        notes: invoice.notes,
        contract_terms: invoice.contractTerms,
        shooting_date: invoice.shootingDate
      })
      .eq('id', invoice.id);

    if (invoiceError) {
      console.error('Error updating invoice:', invoiceError);
      throw new Error(invoiceError.message);
    }

    // Delete existing items
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoice.id);

    if (deleteItemsError) {
      console.error('Error deleting existing invoice items:', deleteItemsError);
      throw new Error(deleteItemsError.message);
    }

    // Insert updated items
    if (invoice.items && invoice.items.length > 0) {
      const itemsToInsert = invoice.items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        name: item.name
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error updating invoice items:', itemsError);
        throw new Error(itemsError.message);
      }
    }

    // Delete existing payment schedules
    const { error: deleteSchedulesError } = await supabase
      .from('payment_schedules')
      .delete()
      .eq('invoice_id', invoice.id);

    if (deleteSchedulesError) {
      console.error('Error deleting existing payment schedules:', deleteSchedulesError);
      throw new Error(deleteSchedulesError.message);
    }

    // Insert updated payment schedules
    if (invoice.paymentSchedules && invoice.paymentSchedules.length > 0) {
      const schedulesToInsert = invoice.paymentSchedules.map(schedule => ({
        invoice_id: invoice.id,
        due_date: schedule.dueDate,
        percentage: schedule.percentage,
        description: schedule.description,
        status: schedule.status || 'unpaid',
        payment_date: schedule.paymentDate
      }));

      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(schedulesToInsert);

      if (schedulesError) {
        console.error('Error updating payment schedules:', schedulesError);
        throw new Error(schedulesError.message);
      }
    }

    return invoice;
  } catch (error) {
    console.error('Error in updateInvoice:', error);
    throw error;
  }
};

export const deleteInvoice = async (invoiceId: string): Promise<boolean> => {
  try {
    // Delete invoice items first
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      console.error('Error deleting invoice items:', itemsError);
      return false;
    }

    // Delete payment schedules
    const { error: schedulesError } = await supabase
      .from('payment_schedules')
      .delete()
      .eq('invoice_id', invoiceId);

    if (schedulesError) {
      console.error('Error deleting payment schedules:', schedulesError);
      return false;
    }

    // Delete the invoice
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteInvoice:', error);
    return false;
  }
};

export const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId);

    if (error) {
      console.error('Error updating invoice status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateInvoiceStatus:', error);
    return false;
  }
};

export const updateContractStatus = async (invoiceId: string, status: ContractStatus): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ contract_status: status })
      .eq('id', invoiceId);

    if (error) {
      console.error('Error updating contract status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateContractStatus:', error);
    return false;
  }
};

export const updatePaymentScheduleStatus = async (scheduleId: string, status: PaymentStatus, paymentDate?: string): Promise<PaymentSchedule | boolean> => {
  try {
    const updateData: { status: PaymentStatus; payment_date?: string } = { status };
    
    if (paymentDate) {
      updateData.payment_date = paymentDate;
    }
    
    const { data, error } = await supabase
      .from('payment_schedules')
      .update(updateData)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment schedule status:', error);
      return false;
    }

    if (!data) {
      return false;
    }

    return {
      id: data.id,
      dueDate: data.due_date,
      percentage: data.percentage,
      description: data.description || '',
      status: data.status as PaymentStatus,
      paymentDate: data.payment_date
    };
  } catch (error) {
    console.error('Error in updatePaymentScheduleStatus:', error);
    return false;
  }
};
