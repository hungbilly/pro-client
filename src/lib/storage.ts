import { Client, Company, Invoice, InvoiceItem, InvoiceStatus, Job, ContractStatus, PaymentSchedule, PaymentStatus, STORAGE_KEYS } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Helper function to parse enum values safely
const parseEnum = <T extends string>(value: string, enumType: Record<string, T>, defaultValue: T): T => {
  return Object.values(enumType).includes(value as T) ? value as T : defaultValue;
};

// Generate a random view link for invoices
const generateViewLink = (): string => {
  return uuidv4();
};

// Get a single invoice by ID
export const getInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
    
    if (!invoice) {
      return null;
    }
    
    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);
      
    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
    }
    
    // Fetch payment schedules
    const { data: paymentSchedules, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', id);
      
    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
    }
    
    // Map payment schedules to the expected format
    const mappedSchedules: PaymentSchedule[] = paymentSchedules ? paymentSchedules.map(schedule => ({
      id: schedule.id,
      description: schedule.description || '',
      dueDate: schedule.due_date,
      percentage: schedule.percentage,
      status: parseEnum(schedule.status, { paid: 'paid', unpaid: 'unpaid', 'write-off': 'write-off' } as Record<string, PaymentStatus>, 'unpaid'),
      paymentDate: schedule.payment_date || undefined
    })) : [];
    
    // Return the mapped invoice with items and payment schedules
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
      items: items?.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })) || [],
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      paymentSchedules: mappedSchedules
    };
  } catch (error) {
    console.error('Error in getInvoice:', error);
    return null;
  }
};

// Get invoice by view link
export const getInvoiceByViewLink = async (viewLink: string): Promise<Invoice | null> => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('view_link', viewLink)
      .single();
    
    if (error) {
      console.error('Error fetching invoice by view link:', error);
      return null;
    }
    
    if (!invoice) {
      return null;
    }
    
    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);
      
    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
    }
    
    // Fetch payment schedules
    const { data: paymentSchedules, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', invoice.id);
      
    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
    }
    
    // Map payment schedules to the expected format
    const mappedSchedules: PaymentSchedule[] = paymentSchedules ? paymentSchedules.map(schedule => ({
      id: schedule.id,
      description: schedule.description || '',
      dueDate: schedule.due_date,
      percentage: schedule.percentage,
      status: parseEnum(schedule.status, { paid: 'paid', unpaid: 'unpaid', 'write-off': 'write-off' } as Record<string, PaymentStatus>, 'unpaid'),
      paymentDate: schedule.payment_date || undefined
    })) : [];
    
    // Return the mapped invoice with items and schedules
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
      contractStatus: (invoice.contract_status || 'pending') as ContractStatus,
      items: items?.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })) || [],
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      paymentSchedules: mappedSchedules
    };
  } catch (error) {
    console.error('Error in getInvoiceByViewLink:', error);
    return null;
  }
};

// Save a new invoice
export const saveInvoice = async (invoiceData: Omit<Invoice, 'id' | 'viewLink'>): Promise<Invoice | null> => {
  try {
    const viewLink = generateViewLink();
    
    // Insert the invoice
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        client_id: invoiceData.clientId,
        company_id: invoiceData.companyId,
        job_id: invoiceData.jobId,
        number: invoiceData.number,
        amount: invoiceData.amount,
        date: invoiceData.date,
        due_date: invoiceData.dueDate,
        shooting_date: invoiceData.shootingDate,
        status: invoiceData.status,
        contract_status: invoiceData.contractStatus,
        notes: invoiceData.notes,
        contract_terms: invoiceData.contractTerms,
        view_link: viewLink
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving invoice:', error);
      return null;
    }
    
    // Insert invoice items
    if (invoiceData.items && invoiceData.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          invoiceData.items.map(item => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount
          }))
        );
      
      if (itemsError) {
        console.error('Error saving invoice items:', itemsError);
      }
    }
    
    // Insert payment schedules
    if (invoiceData.paymentSchedules && invoiceData.paymentSchedules.length > 0) {
      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(
          invoiceData.paymentSchedules.map(schedule => ({
            id: schedule.id,
            invoice_id: invoice.id,
            description: schedule.description,
            due_date: schedule.dueDate,
            percentage: schedule.percentage,
            status: schedule.status,
            payment_date: schedule.paymentDate
          }))
        );
      
      if (schedulesError) {
        console.error('Error saving payment schedules:', schedulesError);
      }
    }
    
    // Return the complete invoice
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
      items: invoiceData.items || [],
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      paymentSchedules: invoiceData.paymentSchedules || []
    };
  } catch (error) {
    console.error('Error in saveInvoice:', error);
    return null;
  }
};

// Update an existing invoice
export const updateInvoice = async (invoice: Invoice): Promise<Invoice | null> => {
  try {
    // Update the invoice
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
      return null;
    }
    
    // Delete existing invoice items
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoice.id);
    
    if (deleteItemsError) {
      console.error('Error deleting existing invoice items:', deleteItemsError);
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
      } else {
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
            }
          } else {
            // Insert new schedule
            const { error: insertError } = await supabase
              .from('payment_schedules')
              .insert({
                id: schedule.id,
                invoice_id: invoice.id,
                description: schedule.description,
                due_date: schedule.dueDate,
                percentage: schedule.percentage,
                status: schedule.status,
                payment_date: schedule.paymentDate
              });
            
            if (insertError) {
              console.error(`Error inserting payment schedule ${schedule.id}:`, insertError);
            }
          }
        }

        // Delete any payment schedules that are no longer in the invoice.paymentSchedules array
        if (existingSchedules) {
          const currentScheduleIds = invoice.paymentSchedules.map(s => s.id);
          const schedulesToDelete = existingSchedules.filter(s => !currentScheduleIds.includes(s.id));
          
          if (schedulesToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('payment_schedules')
              .delete()
              .in('id', schedulesToDelete.map(s => s.id));
            
            if (deleteError) {
              console.error('Error deleting removed payment schedules:', deleteError);
            }
          }
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
      items: invoice.items || [],
      notes: updatedInvoice.notes,
      contractTerms: updatedInvoice.contract_terms,
      viewLink: updatedInvoice.view_link,
      paymentSchedules: invoice.paymentSchedules || []
    };
  } catch (error) {
    console.error('Error in updateInvoice:', error);
    return null;
  }
};

// Update invoice status
export const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus): Promise<Invoice | null> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId)
      .select();
    
    if (error || !data || data.length === 0) {
      console.error('Error updating invoice status:', error);
      return null;
    }
    
    // Return the updated invoice
    return getInvoice(invoiceId);
  } catch (error) {
    console.error('Error in updateInvoiceStatus:', error);
    return null;
  }
};

// Update contract status
export const updateContractStatus = async (invoiceId: string, contractStatus: ContractStatus): Promise<Invoice | null> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({ contract_status: contractStatus })
      .eq('id', invoiceId)
      .select();
    
    if (error || !data || data.length === 0) {
      console.error('Error updating contract status:', error);
      return null;
    }
    
    // Return the updated invoice
    return getInvoice(invoiceId);
  } catch (error) {
    console.error('Error in updateContractStatus:', error);
    return null;
  }
};

// Update payment schedule status
export const updatePaymentScheduleStatus = async (
  scheduleId: string, 
  status: PaymentStatus,
  paymentDate: string | null = null
): Promise<PaymentSchedule | null> => {
  try {
    const updateData: { 
      status: PaymentStatus, 
      payment_date?: string | null 
    } = { status };
    
    // Only set payment_date if status is 'paid'
    if (status === 'paid') {
      updateData.payment_date = paymentDate || new Date().toISOString().split('T')[0];
    } else {
      // Clear payment date for other statuses
      updateData.payment_date = null;
    }
    
    const { data, error } = await supabase
      .from('payment_schedules')
      .update(updateData)
      .eq('id', scheduleId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating payment schedule status:', error);
      return null;
    }
    
    return {
      id: data.id,
      description: data.description || '',
      dueDate: data.due_date,
      percentage: data.percentage,
      status: data.status as PaymentStatus,
      paymentDate: data.payment_date || undefined
    };
  } catch (error) {
    console.error('Error in updatePaymentScheduleStatus:', error);
    return null;
  }
};

// Get invoices by date (or all invoices if date is not provided)
export const getInvoicesByDate = async (startDate: string | null = null): Promise<Invoice[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('date', { ascending: false });  // Fix: changed 'descending' to 'ascending: false'
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    const { data: invoices, error } = await query;
    
    if (error) {
      console.error('Error fetching invoices by date:', error);
      return [];
    }
    
    if (!invoices || invoices.length === 0) {
      return [];
    }
    
    // Map to the expected format
    return invoices.map(invoice => ({
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
      contractStatus: (invoice.contract_status || 'pending') as ContractStatus,
      items: [],  // Items are typically loaded separately
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      paymentSchedules: []  // Payment schedules are typically loaded separately
    }));
  } catch (error) {
    console.error('Error in getInvoicesByDate:', error);
    return [];
  }
};

// Other necessary functions that might be missing from storage.ts
export const getClient = async (id: string): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      companyId: data.company_id,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error in getClient:', error);
    return null;
  }
};

export const getClients = async (): Promise<Client[]> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
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
      companyId: client.company_id,
      createdAt: client.created_at
    }));
  } catch (error) {
    console.error('Error in getClients:', error);
    return [];
  }
};

export const saveClient = async (client: Omit<Client, 'id' | 'createdAt'>): Promise<Client | null> => {
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
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      companyId: data.company_id,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error in saveClient:', error);
    return null;
  }
};

export const updateClient = async (client: Client): Promise<Client | null> => {
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
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      companyId: data.company_id,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error in updateClient:', error);
    return null;
  }
};

export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
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

export const getClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });  // Fix: changed 'descending' to 'ascending: false'
    
    if (error) {
      console.error('Error fetching client invoices:', error);
      return [];
    }
    
    return (data || []).map(invoice => ({
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
      contractStatus: (invoice.contract_status || 'pending') as ContractStatus,
      items: [],
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      paymentSchedules: []
    }));
  } catch (error) {
    console.error('Error in getClientInvoices:', error);
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
      console.error('Error fetching job:', error);
      return null;
    }
    
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
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in getJob:', error);
    return null;
  }
};

export const getJobs = async (): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('date', { ascending: false });  // Fix: changed 'descending' to 'ascending: false'
    
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
      status: job.status,
      date: job.date,
      location: job.location,
      startTime: job.start_time,
      endTime: job.end_time,
      isFullDay: job.is_full_day,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    }));
  } catch (error) {
    console.error('Error in getJobs:', error);
    return [];
  }
};

export const saveJob = async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job | null> => {
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
    
    if (error) {
      console.error('Error saving job:', error);
      return null;
    }
    
    return {
      id: data.id,
      clientId: data.client_id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      status: data.status,
      date: data.date,
      location: data.location,
      startTime: data.startTime,
      endTime: data.endTime,
      isFullDay: data.is_full_day,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in saveJob:', error);
    return null;
  }
};

export const updateJob = async (job: Job): Promise<Job | null> => {
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
        is_full_day: job.isFullDay
      })
      .eq('id', job.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating job:', error);
      return null;
    }
    
    return {
      id: data.id,
      clientId: data.client_id,
      companyId: data.company_id,
      title: data.title,
      description: data.description,
      status: data.status,
      date: data.date,
      location: data.location,
      startTime: data.startTime,
      endTime: data.endTime,
      isFullDay: data.is_full_day,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in updateJob:', error);
    return null;
  }
};

export const deleteJob = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting job:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteJob:', error);
    return false;
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
      status: job.status,
      date: job.date,
      location: job.location,
      startTime: job.start_time,
      endTime: job.end_time,
      isFullDay: job.is_full_day,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    }));
  } catch (error) {
    console.error('Error in getClientJobs:', error);
    return [];
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
    
    return (data || []).map(invoice => ({
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
      contractStatus: (invoice.contract_status || 'pending') as ContractStatus,
      items: [],
      notes: invoice.notes,
      contractTerms: invoice.contract_terms,
      viewLink: invoice.view_link,
      paymentSchedules: []
    }));
  } catch (error) {
    console.error('Error in getJobInvoices:', error);
    return [];
  }
};
