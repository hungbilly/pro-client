import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import {
  Client,
  InvoiceItem,
  Job,
  InvoiceTemplate,
  PaymentSchedule,
  PaymentStatus,
  Invoice,
  ContractStatus,
  Package,
  CompanyClientView
} from '@/types';

// Storage keys for localStorage
export const STORAGE_KEYS = {
  CLIENTS: 'wedding-clients',
  INVOICES: 'wedding-invoices',
  JOBS: 'wedding-jobs'
};

// Map database client to our Client interface
const mapClientFromDatabase = (data: any): Client => {
  return {
    id: data.id,
    name: data.name,
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    notes: data.notes || '',
    createdAt: data.created_at,
    companyId: data.company_id || ''
  };
};

// Map database job to our Job interface
const mapJobFromDatabase = (data: any): Job => {
  return {
    id: data.id,
    clientId: data.client_id,
    companyId: data.company_id || '',
    title: data.title,
    description: data.description || '',
    status: data.status,
    date: data.date || '',
    location: data.location || '',
    startTime: data.start_time || '',
    endTime: data.end_time || '',
    isFullDay: data.is_full_day || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    calendarEventId: data.calendar_event_id,
    timezone: data.timezone || 'UTC'
  };
};

// Map our Client interface to database format
const mapClientForDatabase = (client: Client): any => {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    notes: client.notes,
    company_id: client.companyId,
    created_at: client.createdAt
  };
};

// Map our Job interface to database format
const mapJobForDatabase = (job: Job): any => {
  return {
    id: job.id,
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
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    calendar_event_id: job.calendarEventId,
    timezone: job.timezone
  };
};

// Map payment schedule from database
const mapPaymentScheduleFromDatabase = (data: any): PaymentSchedule => {
  return {
    id: data.id,
    dueDate: data.due_date,
    percentage: data.percentage,
    description: data.description || '',
    status: data.status as PaymentStatus,
    paymentDate: data.payment_date,
    amount: data.amount
  };
};

// Map payment schedule to database format
const mapPaymentScheduleForDatabase = (schedule: PaymentSchedule, invoiceId: string): any => {
  return {
    id: schedule.id,
    invoice_id: invoiceId,
    description: schedule.description,
    due_date: schedule.dueDate,
    percentage: schedule.percentage,
    status: schedule.status,
    payment_date: schedule.paymentDate,
    amount: schedule.amount
  };
};

// Map invoice from database format
const mapInvoiceFromDatabase = (invoiceData: any): Invoice => {
  return {
    id: invoiceData.id,
    clientId: invoiceData.client_id,
    companyId: invoiceData.company_id || '',
    jobId: invoiceData.job_id,
    number: invoiceData.number,
    amount: invoiceData.amount,
    date: invoiceData.date,
    dueDate: invoiceData.due_date,
    status: invoiceData.status,
    contractStatus: invoiceData.contract_status || 'pending',
    items: [], // This will be populated later
    notes: invoiceData.notes,
    contractTerms: invoiceData.contract_terms,
    viewLink: invoiceData.view_link,
    paymentSchedules: [], // This will be populated later
    pdfUrl: invoiceData.pdf_url,
    shootingDate: invoiceData.shooting_date,
    templateId: invoiceData.template_id,
    contractAcceptedAt: invoiceData.contract_accepted_at,
    invoiceAcceptedAt: invoiceData.invoice_accepted_at,
  };
};

// Map invoice to database format
const mapInvoiceForDatabase = (invoice: Invoice): any => {
  return {
    id: invoice.id,
    client_id: invoice.clientId,
    company_id: invoice.companyId,
    job_id: invoice.jobId,
    number: invoice.number,
    amount: invoice.amount,
    date: invoice.date,
    due_date: invoice.dueDate,
    status: invoice.status,
    contract_status: invoice.contractStatus,
    notes: invoice.notes,
    contract_terms: invoice.contractTerms,
    view_link: invoice.viewLink,
    pdf_url: invoice.pdfUrl,
    shooting_date: invoice.shootingDate,
    template_id: invoice.templateId,
    contract_accepted_at: invoice.contractAcceptedAt,
    invoice_accepted_at: invoice.invoiceAcceptedAt
  };
};

// ===================================================================================
// ================================  Client Functions =================================
// ===================================================================================

export const getClients = async (companyId?: string): Promise<Client[]> => {
  try {
    let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
    
    // If companyId is provided, filter by it
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data: clients, error } = await query;

    if (error) {
      console.error("Error fetching clients:", error);
      return [];
    }

    return (clients || []).map(mapClientFromDatabase);
  } catch (error) {
    console.error("Unexpected error fetching clients:", error);
    return [];
  }
};

export const getClient = async (id: string): Promise<Client | null> => {
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching client with id ${id}:`, error);
      return null;
    }

    return client ? mapClientFromDatabase(client) : null;
  } catch (error) {
    console.error(`Unexpected error fetching client with id ${id}:`, error);
    return null;
  }
};

export const saveClient = async (client: Client): Promise<Client> => {
  try {
    const dbClient = mapClientForDatabase(client);
    
    const { data, error } = await supabase
      .from('clients')
      .insert([dbClient])
      .select()
      .single();

    if (error) {
      console.error("Error saving client:", error);
      throw error;
    }

    return mapClientFromDatabase(data);
  } catch (error) {
    console.error("Unexpected error saving client:", error);
    throw error;
  }
};

export const updateClient = async (client: Client): Promise<Client> => {
  try {
    const dbClient = mapClientForDatabase(client);
    
    const { data, error } = await supabase
      .from('clients')
      .update(dbClient)
      .eq('id', client.id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating client with id ${client.id}:`, error);
      throw error;
    }

    return mapClientFromDatabase(data);
  } catch (error) {
    console.error(`Unexpected error updating client with id ${client.id}:`, error);
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
      console.error(`Error deleting client with id ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Unexpected error deleting client with id ${id}:`, error);
    throw error;
  }
};

// ===================================================================================
// ================================  Company Functions =================================
// ===================================================================================

export const getCompanies = async (userId: string): Promise<Company[]> => {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching companies:", error);
      return [];
    }

    return companies || [];
  } catch (error) {
    console.error("Unexpected error fetching companies:", error);
    return [];
  }
};

export const getCompany = async (id: string): Promise<Company | null> => {
  try {
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching company with id ${id}:`, error);
      return null;
    }

    return company || null;
  } catch (error) {
    console.error(`Unexpected error fetching company with id ${id}:`, error);
    return null;
  }
};

export const saveCompany = async (company: Company): Promise<Company> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .insert([company])
      .select()
      .single();

    if (error) {
      console.error("Error saving company:", error);
      throw error;
    }

    return data as Company;
  } catch (error) {
    console.error("Unexpected error saving company:", error);
    throw error;
  }
};

export const updateCompany = async (company: Company): Promise<Company> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .update(company)
      .eq('id', company.id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating company with id ${company.id}:`, error);
      throw error;
    }

    return data as Company;
  } catch (error) {
    console.error(`Unexpected error updating company with id ${company.id}:`, error);
    throw error;
  }
};

export const deleteCompany = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting company with id ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Unexpected error deleting company with id ${id}:`, error);
    throw error;
  }
};

// ===================================================================================
// ================================  Company Client View Functions =====================
// ===================================================================================

export const getCompanyClientViews = async (companyId: string): Promise<CompanyClientView[]> => {
  try {
    const { data: companyClientViews, error } = await supabase
      .from('company_clientview')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching company client views:", error);
      return [];
    }

    return companyClientViews || [];
  } catch (error) {
    console.error("Unexpected error fetching company client views:", error);
    return [];
  }
};

export const getCompanyClientView = async (id: string): Promise<CompanyClientView | null> => {
  try {
    const { data: companyClientView, error } = await supabase
      .from('company_clientview')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching company client view with id ${id}:`, error);
      return null;
    }

    return companyClientView || null;
  } catch (error) {
    console.error(`Unexpected error fetching company client view with id ${id}:`, error);
    return null;
  }
};

// ===================================================================================
// ================================  Job Functions =====================================
// ===================================================================================

export const getJobs = async (companyId?: string): Promise<Job[]> => {
  try {
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    
    // If companyId is provided, filter by it
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data: jobs, error } = await query;

    if (error) {
      console.error("Error fetching jobs:", error);
      return [];
    }

    return (jobs || []).map(mapJobFromDatabase);
  } catch (error) {
    console.error("Unexpected error fetching jobs:", error);
    return [];
  }
};

export const getJob = async (id: string): Promise<Job | null> => {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching job with id ${id}:`, error);
      return null;
    }

    return job ? mapJobFromDatabase(job) : null;
  } catch (error) {
    console.error(`Unexpected error fetching job with id ${id}:`, error);
    return null;
  }
};

export const saveJob = async (job: Job): Promise<Job> => {
  try {
    const dbJob = mapJobForDatabase(job);
    
    const { data, error } = await supabase
      .from('jobs')
      .insert([dbJob])
      .select()
      .single();

    if (error) {
      console.error("Error saving job:", error);
      throw error;
    }

    return mapJobFromDatabase(data);
  } catch (error) {
    console.error("Unexpected error saving job:", error);
    throw error;
  }
};

export const updateJob = async (job: Job): Promise<Job> => {
  try {
    const dbJob = mapJobForDatabase(job);
    
    const { data, error } = await supabase
      .from('jobs')
      .update(dbJob)
      .eq('id', job.id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating job with id ${job.id}:`, error);
      throw error;
    }

    return mapJobFromDatabase(data);
  } catch (error) {
    console.error(`Unexpected error updating job with id ${job.id}:`, error);
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
      console.error(`Error deleting job with id ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Unexpected error deleting job with id ${id}:`, error);
    throw error;
  }
};

// ===================================================================================
// ================================  Invoice Functions =================================
// ===================================================================================

// Function to map database invoice data to the Invoice interface
const mapInvoiceFromDatabase = (invoiceData: any): Invoice => {
  return {
    id: invoiceData.id,
    clientId: invoiceData.client_id,
    companyId: invoiceData.company_id || '',
    jobId: invoiceData.job_id,
    number: invoiceData.number,
    amount: invoiceData.amount,
    date: invoiceData.date,
    dueDate: invoiceData.due_date,
    status: invoiceData.status,
    contractStatus: invoiceData.contract_status || 'pending',
    items: [], // This will be populated later
    notes: invoiceData.notes,
    contractTerms: invoiceData.contract_terms,
    viewLink: invoiceData.view_link,
    paymentSchedules: [], // This will be populated later
    pdfUrl: invoiceData.pdf_url,
    shootingDate: invoiceData.shooting_date,
    templateId: invoiceData.template_id,
    contractAcceptedAt: invoiceData.contract_accepted_at,
    invoiceAcceptedAt: invoiceData.invoice_accepted_at,
  };
};

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    const { data: invoicesData, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return [];
    }

    const invoices: Invoice[] = invoicesData.map(mapInvoiceFromDatabase);
    return invoices;
  } catch (error) {
    console.error("Unexpected error fetching invoices:", error);
    return [];
  }
};

export const getInvoicesByDate = async (date: string): Promise<Invoice[]> => {
  try {
    const { data: invoicesData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching invoices by date:", error);
      return [];
    }

    const invoices: Invoice[] = invoicesData.map(mapInvoiceFromDatabase);
    return invoices;
  } catch (error) {
    console.error("Unexpected error fetching invoices by date:", error);
    return [];
  }
};

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    const { data: invoiceData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      return null;
    }

    if (!invoiceData) {
      console.log(`Invoice with id ${id} not found.`);
      return null;
    }

    const invoice: Invoice = mapInvoiceFromDatabase(invoiceData);

    // Fetch invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      console.error(`Error fetching invoice items for invoice id ${id}:`, itemsError);
      invoice.items = []; // Assign empty array in case of error
    } else {
      invoice.items = itemsData as InvoiceItem[];
    }

    // Fetch payment schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', id)
      .order('due_date', { ascending: true });

    if (schedulesError) {
      console.error(`Error fetching payment schedules for invoice id ${id}:`, schedulesError);
      invoice.paymentSchedules = []; // Assign empty array in case of error
    } else {
      invoice.paymentSchedules = schedulesData.map(mapPaymentScheduleFromDatabase);
    }

    return invoice;
  } catch (error) {
    console.error(`Unexpected error fetching invoice with id ${id}:`, error);
    return null;
  }
};

export const getInvoiceByViewLink = async (viewLink: string): Promise<Invoice | null> => {
  try {
    const { data: invoiceData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('view_link', viewLink)
      .single();

    if (error) {
      console.error(`Error fetching invoice with view link ${viewLink}:`, error);
      return null;
    }

    if (!invoiceData) {
      console.log(`Invoice with view link ${viewLink} not found.`);
      return null;
    }

    const invoice: Invoice = mapInvoiceFromDatabase(invoiceData);

    // Fetch invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (itemsError) {
      console.error(`Error fetching invoice items for invoice id ${invoice.id}:`, itemsError);
      invoice.items = []; // Assign empty array in case of error
    } else {
      invoice.items = itemsData as InvoiceItem[];
    }

    // Fetch payment schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('due_date', { ascending: true });

    if (schedulesError) {
      console.error(`Error fetching payment schedules for invoice id ${invoice.id}:`, schedulesError);
      invoice.paymentSchedules = []; // Assign empty array in case of error
    } else {
      invoice.paymentSchedules = schedulesData.map(mapPaymentScheduleFromDatabase);
    }

    return invoice;
  } catch (error) {
    console.error(`Unexpected error fetching invoice with view link ${viewLink}:`, error);
    return null;
  }
};

export const saveInvoice = async (invoice: Invoice): Promise<Invoice> => {
  try {
    // Omit the 'id' property from the invoice object to prevent conflicts with auto-generated IDs
    const { id, items, paymentSchedules, ...invoiceData } = invoice;

    // Map the invoice data to the database format
    const dbInvoiceData = mapInvoiceForDatabase({ id, ...invoiceData, items: [], paymentSchedules: [] });

    // Insert the invoice data into the 'invoices' table
    const { data: newInvoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([dbInvoiceData])
      .select()
      .single();

    if (invoiceError) {
      console.error("Error saving invoice:", invoiceError);
      throw invoiceError;
    }

    if (!newInvoiceData) {
      throw new Error("Invoice was not created successfully");
    }

    const newInvoice: Invoice = mapInvoiceFromDatabase(newInvoiceData);

    // Save invoice items
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        invoice_id: newInvoice.id,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error saving invoice items:", itemsError);
        throw itemsError;
      }
    }

    // Save payment schedules
    if (paymentSchedules && paymentSchedules.length > 0) {
      const schedulesToInsert = paymentSchedules.map(schedule => 
        mapPaymentScheduleForDatabase(schedule, newInvoice.id)
      );

      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(schedulesToInsert);

      if (schedulesError) {
        console.error("Error saving payment schedules:", schedulesError);
        throw schedulesError;
      }
    }

    return newInvoice;
  } catch (error) {
    console.error("Unexpected error saving invoice:", error);
    throw error;
  }
};

export const updateInvoice = async (invoice: Invoice): Promise<Invoice> => {
  try {
    // Destructure invoice properties
    const { id, items, paymentSchedules, ...invoiceData } = invoice;

    // Map the invoice data to the database format
    const dbInvoiceData = mapInvoiceForDatabase({ id, ...invoiceData, items: [], paymentSchedules: [] });

    // Update the invoice data in the 'invoices' table
    const { data: updatedInvoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .update(dbInvoiceData)
      .eq('id', id)
      .select()
      .single();

    if (invoiceError) {
      console.error(`Error updating invoice with id ${id}:`, invoiceError);
      throw invoiceError;
    }

    if (!updatedInvoiceData) {
      throw new Error(`Invoice with id ${id} not found for update`);
    }

    const updatedInvoice: Invoice = mapInvoiceFromDatabase(updatedInvoiceData);

    // Delete existing invoice items and payment schedules
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    if (deleteItemsError) {
      console.error(`Error deleting existing invoice items for invoice id ${id}:`, deleteItemsError);
      throw deleteItemsError;
    }

    const { error: deleteSchedulesError } = await supabase
      .from('payment_schedules')
      .delete()
      .eq('invoice_id', id);

    if (deleteSchedulesError) {
      console.error(`Error deleting existing payment schedules for invoice id ${id}:`, deleteSchedulesError);
      throw deleteSchedulesError;
    }

    // Insert the new invoice items
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        invoice_id: id,
      }));

      const { error: insertItemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertItemsError) {
        console.error("Error saving invoice items:", insertItemsError);
        throw insertItemsError;
      }
    }

    // Insert the new payment schedules
    if (paymentSchedules && paymentSchedules.length > 0) {
      const schedulesToInsert = paymentSchedules.map(schedule => 
        mapPaymentScheduleForDatabase(schedule, id)
      );

      const { error: insertSchedulesError } = await supabase
        .from('payment_schedules')
        .insert(schedulesToInsert);

      if (insertSchedulesError) {
        console.error("Error saving payment schedules:", insertSchedulesError);
        throw insertSchedulesError;
      }
    }

    return updatedInvoice;
  } catch (error) {
    console.error(`Unexpected error updating invoice with id ${invoice.id}:`, error);
    throw error;
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    // First, delete associated records in 'invoice_items' and 'payment_schedules'
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    if (deleteItemsError) {
      console.error(`Error deleting invoice items for invoice id ${id}:`, deleteItemsError);
      throw deleteItemsError;
    }

    const { error: deleteSchedulesError } = await supabase
      .from('payment_schedules')
      .delete()
      .eq('invoice_id', id);

    if (deleteSchedulesError) {
      console.error(`Error deleting payment schedules for invoice id ${id}:`, deleteSchedulesError);
      throw deleteSchedulesError;
    }

    // Now, delete the invoice itself
    const { error: deleteInvoiceError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (deleteInvoiceError) {
      console.error(`Error deleting invoice with id ${id}:`, deleteInvoiceError);
      throw deleteInvoiceError;
    }
  } catch (error) {
    console.error(`Unexpected error deleting invoice with id ${id}:`, error);
    throw error;
  }
};

export const updateInvoiceStatus = async (id: string, status: Invoice['status']): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error(`Error updating invoice status for invoice id ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Unexpected error updating invoice status for invoice id ${id}:`, error);
    throw error;
  }
};

export const updateContractStatus = async (id: string, contractStatus: Invoice['contractStatus']): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({ 
        contract_status: contractStatus,
        contract_accepted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating contract status for invoice id ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Unexpected error updating contract status for invoice id ${id}:`, error);
    throw error;
  }
};

export const updatePaymentScheduleStatus = async (paymentId: string, status: PaymentStatus, paymentDate?: string): Promise<PaymentSchedule | null> => {
  try {
    const updates: { status: PaymentStatus; payment_date?: string } = { status };
    if (paymentDate) {
      updates.payment_date = paymentDate;
    }

    const { data, error } = await supabase
      .from('payment_schedules')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating payment schedule status for payment id ${paymentId}:`, error);
      return null;
    }

    return data ? mapPaymentScheduleFromDatabase(data) : null;
  } catch (error) {
    console.error(`Unexpected error updating payment schedule status for payment id ${paymentId}:`, error);
    return null;
  }
};

// ===================================================================================
// ================================  Invoice Template Functions =======================
// ===================================================================================

export const getInvoiceTemplates = async (): Promise<InvoiceTemplate[]> => {
  try {
    const { data: invoiceTemplates, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching invoice templates:", error);
      return [];
    }

    return invoiceTemplates || [];
  } catch (error) {
    console.error("Unexpected error fetching invoice templates:", error);
    return [];
  }
};

export const getInvoiceTemplate = async (id: string): Promise<InvoiceTemplate | null> => {
  try {
    const { data: invoiceTemplate, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching invoice template with id ${id}:`, error);
      return null;
    }

    return invoiceTemplate || null;
  } catch (error) {
    console.error(`Unexpected error fetching invoice template with id ${id}:`, error);
    return null;
  }
};

export const saveInvoiceTemplate = async (invoiceTemplate: InvoiceTemplate): Promise<InvoiceTemplate> => {
  try {
    const { data, error } = await supabase
      .from('invoice_templates')
      .insert([invoiceTemplate])
      .select()
      .single();

    if (error) {
      console.error("Error saving invoice template:", error);
      throw error;
    }

    return data as InvoiceTemplate;
  } catch (error) {
    console.error("Unexpected error saving invoice template:", error);
    throw error;
  }
};

export const updateInvoiceTemplate = async (invoiceTemplate: InvoiceTemplate): Promise<InvoiceTemplate> => {
  try {
    const { data, error } = await supabase
      .from('invoice_templates')
      .update(invoiceTemplate)
      .eq('id', invoiceTemplate.id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating invoice template with id ${invoiceTemplate.id}:`, error);
      throw error;
    }

    return data as InvoiceTemplate;
  } catch (error) {
    console.error(`Unexpected error updating invoice template with id ${invoiceTemplate.id}:`, error);
    throw error;
  }
};

export const deleteInvoiceTemplate = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoice_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting invoice template with id ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Unexpected error deleting invoice template with id ${id}:`, error);
    throw error;
  }
};

// ===================================================================================
// ================================  Client Related Functions =========================
// ===================================================================================

export const getClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  try {
    const { data: invoicesData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      console.error(`Error fetching invoices for client ${clientId}:`, error);
      return [];
    }

    const invoices: Invoice[] = [];
    for (const invoiceData of invoicesData || []) {
      const invoice = mapInvoiceFromDatabase(invoiceData);
      
      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) {
        console.error(`Error fetching invoice items for invoice id ${invoice.id}:`, itemsError);
      } else {
        invoice.items = itemsData || [];
      }

      // Fetch payment schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('due_date', { ascending: true });

      if (schedulesError) {
        console.error(`Error fetching payment schedules for invoice id ${invoice.id}:`, schedulesError);
      } else {
        invoice.paymentSchedules = (schedulesData || []).map(mapPaymentScheduleFromDatabase);
      }

      invoices.push(invoice);
    }

    return invoices;
  } catch (error) {
    console.error(`Unexpected error fetching invoices for client ${clientId}:`, error);
    return [];
  }
};

export const getClientJobs = async (clientId: string): Promise<Job[]> => {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      console.error(`Error fetching jobs for client ${clientId}:`, error);
      return [];
    }

    return (jobs || []).map(mapJobFromDatabase);
  } catch (error) {
    console.error(`Unexpected error fetching jobs for client ${clientId}:`, error);
    return [];
  }
};

// ===================================================================================
// ================================  Job Related Functions ============================
// ===================================================================================

export const getJobInvoices = async (jobId: string): Promise<Invoice[]> => {
  try {
    const { data: invoicesData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId)
      .order('date', { ascending: false });

    if (error) {
      console.error(`Error fetching invoices for job ${jobId}:`, error);
      return [];
    }

    const invoices: Invoice[] = [];
    for (const invoiceData of invoicesData || []) {
      const invoice = mapInvoiceFromDatabase(invoiceData);
      
      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) {
        console.error(`Error fetching invoice items for invoice id ${invoice.id}:`, itemsError);
      } else {
        invoice.items = itemsData || [];
      }

      // Fetch payment schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('due_date', { ascending: true });

      if (schedulesError) {
        console.error(`Error fetching payment schedules for invoice id ${invoice.id}:`, schedulesError);
      } else {
        invoice.paymentSchedules = (schedulesData || []).map(mapPaymentScheduleFromDatabase);
      }

      invoices.push(invoice);
    }

    return invoices;
  } catch (error) {
    console.error(`Unexpected error fetching invoices for job ${jobId}:`, error);
    return [];
  }
};
