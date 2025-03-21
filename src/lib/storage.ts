
import { supabase } from '@/integrations/supabase/client';
import { Client, Job, Invoice, InvoiceStatus, ContractStatus, PaymentStatus, PaymentSchedule } from '@/types';

// Utility function for handling enum parsing
const parseEnum = <T extends string>(value: string, allowedValues: T[], defaultValue: T): T => {
  return allowedValues.includes(value as T) ? (value as T) : defaultValue;
};

// Utility function to generate a unique view link
const generateViewLink = (): string => {
  return `${crypto.randomUUID()}`;
};

// Client functions
export const getClient = async (id: string): Promise<Client | undefined> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error('Error fetching client:', error);
      return undefined;
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      createdAt: data.created_at,
      companyId: data.company_id
    };
  } catch (error) {
    console.error('Error fetching client:', error);
    return undefined;
  }
};

export const getClients = async (companyId?: string | null): Promise<Client[]> => {
  try {
    let query = supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
    
    return (data || []).map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      createdAt: client.created_at,
      companyId: client.company_id
    }));
  } catch (error) {
    console.error('Error fetching clients:', error);
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
    
    if (error || !data) {
      console.error('Error saving client:', error);
      throw new Error(error?.message || 'Failed to save client');
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      createdAt: data.created_at,
      companyId: data.company_id
    };
  } catch (error) {
    console.error('Error saving client:', error);
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
    
    if (error || !data) {
      console.error('Error updating client:', error);
      throw new Error(error?.message || 'Failed to update client');
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      createdAt: data.created_at,
      companyId: data.company_id
    };
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting client:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

export const getClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error fetching client invoices:', error);
      return [];
    }
    
    const invoices: Invoice[] = [];
    
    for (const invoiceData of data || []) {
      // Fetch invoice items for each invoice
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);
      
      if (itemsError) {
        console.error(`Error fetching items for invoice ${invoiceData.id}:`, itemsError);
        continue;
      }
      
      // Get payment schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceData.id);
      
      if (schedulesError) {
        console.error(`Error fetching payment schedules for invoice ${invoiceData.id}:`, schedulesError);
      }
      
      // Map payment schedules
      const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
        id: schedule.id,
        description: schedule.description || '',
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        status: parseEnum(schedule.status, ['paid', 'unpaid', 'write-off'], 'unpaid') as PaymentStatus,
        paymentDate: schedule.payment_date
      }));
      
      invoices.push({
        id: invoiceData.id,
        clientId: invoiceData.client_id,
        companyId: invoiceData.company_id,
        jobId: invoiceData.job_id,
        number: invoiceData.number,
        amount: invoiceData.amount,
        date: invoiceData.date,
        dueDate: invoiceData.due_date,
        shootingDate: invoiceData.shooting_date,
        status: invoiceData.status as InvoiceStatus,
        contractStatus: invoiceData.contract_status as ContractStatus,
        items: (itemsData || []).map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        })),
        notes: invoiceData.notes,
        contractTerms: invoiceData.contract_terms,
        viewLink: invoiceData.view_link,
        paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined
      });
    }
    
    return invoices;
  } catch (error) {
    console.error('Error fetching client invoices:', error);
    return [];
  }
};

export const getClientJobs = async (clientId: string): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error fetching client jobs:', error);
      return [];
    }
    
    return (data || []).map(job => ({
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
      updatedAt: job.updated_at
    }));
  } catch (error) {
    console.error('Error fetching client jobs:', error);
    return [];
  }
};

// Job functions
export const getJob = async (id: string): Promise<Job | undefined> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error('Error fetching job:', error);
      return undefined;
    }
    
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
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error fetching job:', error);
    return undefined;
  }
};

export const getJobs = async (companyId?: string | null): Promise<Job[]> => {
  try {
    let query = supabase
      .from('jobs')
      .select('*')
      .order('date', { descending: true });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
    
    return (data || []).map(job => ({
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
      updatedAt: job.updated_at
    }));
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
};

export const saveJob = async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
  try {
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
        is_full_day: job.isFullDay
      })
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error saving job:', error);
      throw new Error(error?.message || 'Failed to save job');
    }
    
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
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error saving job:', error);
    throw error;
  }
};

export const updateJob = async (job: Job): Promise<Job> => {
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
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error updating job:', error);
      throw new Error(error?.message || 'Failed to update job');
    }
    
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
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error updating job:', error);
    throw error;
  }
};

export const deleteJob = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting job:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
};

export const getJobInvoices = async (jobId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId);
    
    if (error) {
      console.error('Error fetching job invoices:', error);
      return [];
    }
    
    const invoices: Invoice[] = [];
    
    for (const invoiceData of data || []) {
      // Fetch invoice items for each invoice
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);
      
      if (itemsError) {
        console.error(`Error fetching items for invoice ${invoiceData.id}:`, itemsError);
        continue;
      }
      
      // Get payment schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceData.id);
      
      if (schedulesError) {
        console.error(`Error fetching payment schedules for invoice ${invoiceData.id}:`, schedulesError);
      }
      
      // Map payment schedules
      const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
        id: schedule.id,
        description: schedule.description || '',
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        status: parseEnum(schedule.status, ['paid', 'unpaid', 'write-off'], 'unpaid') as PaymentStatus,
        paymentDate: schedule.payment_date
      }));
      
      invoices.push({
        id: invoiceData.id,
        clientId: invoiceData.client_id,
        companyId: invoiceData.company_id,
        jobId: invoiceData.job_id,
        number: invoiceData.number,
        amount: invoiceData.amount,
        date: invoiceData.date,
        dueDate: invoiceData.due_date,
        shootingDate: invoiceData.shooting_date,
        status: invoiceData.status as InvoiceStatus,
        contractStatus: invoiceData.contract_status as ContractStatus,
        items: (itemsData || []).map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        })),
        notes: invoiceData.notes,
        contractTerms: invoiceData.contract_terms,
        viewLink: invoiceData.view_link,
        paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined
      });
    }
    
    return invoices;
  } catch (error) {
    console.error('Error fetching job invoices:', error);
    return [];
  }
};

// Invoice functions
export const getInvoice = async (id: string): Promise<Invoice | undefined> => {
  try {
    // First get the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return undefined;
    }
    
    // Then get the invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);
    
    if (itemsError || !itemsData) {
      console.error('Error fetching invoice items:', itemsError);
      return undefined;
    }

    // Get payment schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', id);
    
    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
      // Continue without payment schedules
    }
    
    // Map and transform the data
    const invoiceItems = itemsData.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));

    // Map payment schedules
    const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
      id: schedule.id,
      description: schedule.description || '',
      dueDate: schedule.due_date,
      percentage: schedule.percentage,
      status: parseEnum(schedule.status, ['paid', 'unpaid', 'write-off'], 'unpaid') as PaymentStatus,
      paymentDate: schedule.payment_date
    }));
    
    console.log('Payment schedules fetched:', paymentSchedules);
    
    return {
      id: invoice.id,
      clientId: invoice.client_id,
      companyId: invoice.company_id,
      jobId: invoice.job_id,
      number: invoice.number,
      amount: invoice.amount,
      date: invoice.date,
      dueDate: invoice.due_date,
      shootingDate: invoice.shooting_date,
      status: invoice.status as InvoiceStatus,
      contractStatus: invoice.contract_status as ContractStatus,
      items: invoiceItems,
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return undefined;
  }
};

export const getInvoiceByViewLink = async (viewLink: string): Promise<Invoice | undefined> => {
  try {
    console.log('Searching for invoice with view_link parameter:', viewLink);
    
    // Get all invoices to search more flexibly
    const { data: allInvoices, error: invoiceQueryError } = await supabase
      .from('invoices')
      .select('*');
    
    if (invoiceQueryError) {
      console.error('Error querying invoices:', invoiceQueryError);
      return undefined;
    }
    
    // Log available invoices for debugging
    console.log('Found invoices (view_links):', allInvoices?.map(inv => inv.view_link));
    
    // First try direct match
    let matchingInvoice = allInvoices?.find(inv => inv.view_link === viewLink);
    
    // If no direct match, try to match just the ID portion
    if (!matchingInvoice) {
      // Extract the ID portion if it's a full URL
      const idPortion = viewLink.includes('/invoice/') 
        ? viewLink.split('/invoice/')[1]
        : viewLink;
      
      console.log('Trying to match with ID portion:', idPortion);
      
      // Try to find by ID directly
      matchingInvoice = allInvoices?.find(inv => inv.id === idPortion);
      
      // If still not found, try to find by partial view_link match
      if (!matchingInvoice) {
        matchingInvoice = allInvoices?.find(inv => {
          if (!inv.view_link) return false;
          return inv.view_link.includes(idPortion) || 
                 (inv.view_link.includes('/invoice/') && 
                  inv.view_link.split('/invoice/')[1] === idPortion);
        });
      }
    }
    
    if (!matchingInvoice) {
      console.error('No invoice found with matching view link or ID');
      return undefined;
    }
    
    console.log('Found matching invoice:', matchingInvoice);
    
    // Get the invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', matchingInvoice.id);
    
    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return undefined;
    }
    
    // Get payment schedules - Added this query to include payment schedules in the initial response
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', matchingInvoice.id);
    
    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
      // Continue without payment schedules
    } else {
      console.log('Payment schedules fetched for view link:', schedulesData);
    }
    
    // Map and transform the data
    const invoiceItems = (itemsData || []).map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));
    
    // Map payment schedules
    const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
      id: schedule.id,
      description: schedule.description || '',
      dueDate: schedule.due_date,
      percentage: schedule.percentage,
      status: parseEnum(schedule.status, ['paid', 'unpaid', 'write-off'], 'unpaid') as PaymentStatus,
      paymentDate: schedule.payment_date
    }));
    
    // Properly cast the status string to the InvoiceStatus type
    const status = matchingInvoice.status as InvoiceStatus;
    
    // Handle possible undefined contractStatus
    let contractStatus: ContractStatus | undefined = undefined;
    if (matchingInvoice.contract_status) {
      contractStatus = matchingInvoice.contract_status as ContractStatus;
    }
    
    return {
      id: matchingInvoice.id,
      clientId: matchingInvoice.client_id,
      companyId: matchingInvoice.company_id,
      jobId: matchingInvoice.job_id,
      number: matchingInvoice.number,
      amount: matchingInvoice.amount,
      date: matchingInvoice.date,
      dueDate: matchingInvoice.due_date,
      shootingDate: matchingInvoice.shooting_date,
      status,
      contractStatus,
      items: invoiceItems,
      notes: matchingInvoice.notes,
      contractTerms: matchingInvoice.contract_terms,
      viewLink: matchingInvoice.view_link,
      paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined
    };
  } catch (error) {
    console.error('Error in getInvoiceByViewLink:', error);
    return undefined;
  }
};

export const getInvoices = async (companyId?: string | null): Promise<Invoice[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('date', { descending: true });
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
    
    const invoices: Invoice[] = [];
    
    for (const invoiceData of data || []) {
      // Fetch invoice items for each invoice
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);
      
      if (itemsError) {
        console.error(`Error fetching items for invoice ${invoiceData.id}:`, itemsError);
        continue;
      }
      
      // Get payment schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceData.id);
      
      if (schedulesError) {
        console.error(`Error fetching payment schedules for invoice ${invoiceData.id}:`, schedulesError);
      }
      
      // Map payment schedules
      const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
        id: schedule.id,
        description: schedule.description || '',
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        status: parseEnum(schedule.status, ['paid', 'unpaid', 'write-off'], 'unpaid') as PaymentStatus,
        paymentDate: schedule.payment_date
      }));
      
      invoices.push({
        id: invoiceData.id,
        clientId: invoiceData.client_id,
        companyId: invoiceData.company_id,
        jobId: invoiceData.job_id,
        number: invoiceData.number,
        amount: invoiceData.amount,
        date: invoiceData.date,
        dueDate: invoiceData.due_date,
        shootingDate: invoiceData.shooting_date,
        status: invoiceData.status as InvoiceStatus,
        contractStatus: invoiceData.contract_status as ContractStatus,
        items: (itemsData || []).map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        })),
        notes: invoiceData.notes,
        contractTerms: invoiceData.contract_terms,
        viewLink: invoiceData.view_link,
        paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined
      });
    }
    
    return invoices;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
};

export const saveInvoice = async (invoice: Omit<Invoice, 'id' | 'viewLink'>): Promise<Invoice> => {
  try {
    // Generate a view link
    const viewLink = generateViewLink();
    
    // Start a transaction by using the Supabase client
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        client_id: invoice.clientId,
        company_id: invoice.companyId,
        job_id: invoice.jobId,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        due_date: invoice.dueDate,
        shooting_date: invoice.shootingDate,
        status: invoice.status,
        contract_status: invoice.contractStatus,
        notes: invoice.notes,
        contract_terms: invoice.contractTerms,
        view_link: viewLink
      })
      .select()
      .single();
    
    if (invoiceError || !newInvoice) {
      console.error('Error saving invoice:', invoiceError);
      throw new Error(invoiceError?.message || 'Failed to save invoice');
    }

    // Save invoice items if they exist
    if (invoice.items && invoice.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          invoice.items.map(item => ({
            invoice_id: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount
          }))
        );
      
      if (itemsError) {
        console.error('Error saving invoice items:', itemsError);
        throw new Error(itemsError.message || 'Failed to save invoice items');
      }
    }

    // Save payment schedules if they exist
    if (invoice.paymentSchedules && invoice.paymentSchedules.length > 0) {
      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(
          invoice.paymentSchedules.map(schedule => ({
            invoice_id: newInvoice.id,
            description: schedule.description,
            due_date: schedule.dueDate,
            percentage: schedule.percentage,
            status: schedule.status,
            payment_date: schedule.paymentDate
          }))
        );
      
      if (schedulesError) {
        console.error('Error saving payment schedules:', schedulesError);
        throw new Error(schedulesError.message || 'Failed to save payment schedules');
      }
    }

    return {
      id: newInvoice.id,
      clientId: newInvoice.client_id,
      companyId: newInvoice.company_id,
      jobId: newInvoice.job_id,
      number: newInvoice.number,
      amount: newInvoice.amount,
      date: newInvoice.date,
      dueDate: newInvoice.due_date,
      shootingDate: newInvoice.shooting_date,
      status: newInvoice.status as InvoiceStatus,
      contractStatus: newInvoice.contract_status as ContractStatus,
      items: invoice.items || [],
      notes: newInvoice.notes,
      contractTerms: newInvoice.contract_terms,
      viewLink: newInvoice.view_link,
      paymentSchedules: invoice.paymentSchedules
    };
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
};

export const updateInvoice = async (invoice: Invoice): Promise<Invoice> => {
  try {
    // Start a transaction by using the Supabase client
    const { data: updatedInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        client_id: invoice.clientId,
        company_id: invoice.companyId,
        job_id: invoice.jobId,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        due_date: invoice.dueDate,
        shooting_date: invoice.shootingDate,
        status: invoice.status,
        contract_status: invoice.contractStatus,
        notes: invoice.notes,
        contract_terms: invoice.contractTerms
      })
      .eq('id', invoice.id)
      .select()
      .single();
    
    if (invoiceError || !updatedInvoice) {
      console.error('Error updating invoice:', invoiceError);
      throw new Error(invoiceError?.message || 'Failed to update invoice');
    }
    
    // Delete existing invoice items
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoice.id);
    
    if (deleteItemsError) {
      console.error('Error deleting existing invoice items:', deleteItemsError);
      throw new Error(deleteItemsError.message);
    }
    
    // Add new invoice items
    if (invoice.items && invoice.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          invoice.items.map(item => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount
          }))
        );
      
      if (itemsError) {
        console.error('Error adding new invoice items:', itemsError);
        throw new Error(itemsError.message);
      }
    }

    // Handle payment schedules if they exist
    if (invoice.paymentSchedules && invoice.paymentSchedules.length > 0) {
      // Fetch existing payment schedules
      const { data: existingSchedules, error: fetchSchedulesError } = await supabase
        .from('payment_schedules')
        .select('id')
        .eq('invoice_id', invoice.id);
      
      if (fetchSchedulesError) {
        console.error('Error fetching existing payment schedules:', fetchSchedulesError);
        throw new Error(fetchSchedulesError.message);
      }

      // Update existing payment schedules or insert new ones
      for (const schedule of invoice.paymentSchedules) {
        const existingSchedule = existingSchedules?.find(s => s.id === schedule.id);
        
        if (existingSchedule) {
          // Update existing schedule
          const { error: updateError } = await supabase
            .from('payment_schedules')
            .update({
              description: schedule.description,
              due_date: schedule.dueDate,
              percentage: schedule.percentage,
              status: schedule.status,
              payment_date: schedule.paymentDate
            })
            .eq('id', schedule.id);
          
          if (updateError) {
            console.error(`Error updating payment schedule ${schedule.id}:`, updateError);
            throw new Error(updateError.message);
          }
        } else {
          // Insert new schedule
          const { error: insertError } = await supabase
            .from('payment_schedules')
            .insert({
              invoice_id: invoice.id,
              description: schedule.description,
              due_date: schedule.dueDate,
              percentage: schedule.percentage,
              status: schedule.status,
              payment_date: schedule.paymentDate
            });
          
          if (insertError) {
            console.error(`Error inserting new payment schedule:`, insertError);
            throw new Error(insertError.message);
          }
        }
      }

      // Delete any payment schedules that are no longer in the invoice.paymentSchedules array
      const currentScheduleIds = invoice.paymentSchedules.map(s => s.id);
      const schedulesToDelete = existingSchedules?.filter(s => !currentScheduleIds.includes(s.id)) || [];
      
      if (schedulesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('payment_schedules')
          .delete()
          .in('id', schedulesToDelete.map(s => s.id));
        
        if (deleteError) {
          console.error('Error deleting removed payment schedules:', deleteError);
          throw new Error(deleteError.message);
        }
      }
    }
    
    return {
      id: updatedInvoice.id,
      clientId: updatedInvoice.client_id,
      companyId: updatedInvoice.company_id,
      jobId: updatedInvoice.job_id,
      number: updatedInvoice.number,
      amount: updatedInvoice.amount,
      date: updatedInvoice.date,
      dueDate: updatedInvoice.due_date,
      shootingDate: updatedInvoice.shooting_date,
      status: updatedInvoice.status as InvoiceStatus,
      contractStatus: updatedInvoice.contract_status as ContractStatus,
      items: invoice.items,
      notes: updatedInvoice.notes,
      contractTerms: updatedInvoice.contract_terms,
      viewLink: updatedInvoice.view_link,
      paymentSchedules: invoice.paymentSchedules
    };
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating invoice status:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error updating invoice status:', error);
    throw error;
  }
};

export const updateContractStatus = async (id: string, contractStatus: ContractStatus): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ contract_status: contractStatus })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating contract status:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error updating contract status:', error);
    throw error;
  }
};

export const updatePaymentScheduleStatus = async (
  id: string,
  status: PaymentStatus,
  paymentDate?: string
): Promise<void> => {
  try {
    const updateData: { status: PaymentStatus; payment_date?: string } = { status };
    
    // Only include payment date when status is 'paid'
    if (status === 'paid' && paymentDate) {
      updateData.payment_date = paymentDate;
    }
    
    const { error } = await supabase
      .from('payment_schedules')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating payment schedule status:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error updating payment schedule status:', error);
    throw error;
  }
};

export const getInvoicesByDate = async (
  startDate: string,
  endDate: string,
  companyId?: string | null
): Promise<Invoice[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching invoices by date:', error);
      return [];
    }
    
    const invoices: Invoice[] = [];
    
    for (const invoiceData of data || []) {
      // Fetch invoice items for each invoice
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);
      
      if (itemsError) {
        console.error(`Error fetching items for invoice ${invoiceData.id}:`, itemsError);
        continue;
      }
      
      // Get payment schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoiceData.id);
      
      if (schedulesError) {
        console.error(`Error fetching payment schedules for invoice ${invoiceData.id}:`, schedulesError);
      }
      
      // Map payment schedules
      const paymentSchedules: PaymentSchedule[] = (schedulesData || []).map(schedule => ({
        id: schedule.id,
        description: schedule.description || '',
        dueDate: schedule.due_date,
        percentage: schedule.percentage,
        status: parseEnum(schedule.status, ['paid', 'unpaid', 'write-off'], 'unpaid') as PaymentStatus,
        paymentDate: schedule.payment_date
      }));
      
      invoices.push({
        id: invoiceData.id,
        clientId: invoiceData.client_id,
        companyId: invoiceData.company_id,
        jobId: invoiceData.job_id,
        number: invoiceData.number,
        amount: invoiceData.amount,
        date: invoiceData.date,
        dueDate: invoiceData.due_date,
        shootingDate: invoiceData.shooting_date,
        status: invoiceData.status as InvoiceStatus,
        contractStatus: invoiceData.contract_status as ContractStatus,
        items: (itemsData || []).map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        })),
        notes: invoiceData.notes,
        contractTerms: invoiceData.contract_terms,
        viewLink: invoiceData.view_link,
        paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined
      });
    }
    
    return invoices;
  } catch (error) {
    console.error('Error fetching invoices by date:', error);
    return [];
  }
};
