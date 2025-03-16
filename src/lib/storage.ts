import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Client, Company, Invoice, InvoiceItem, InvoiceStatus, ContractStatus, Job } from '@/types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Client functions
export const getClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return data || [];
};

export const getClient = async (id: string): Promise<Client | null> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    return null;
  }

  return data;
};

export const saveClient = async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client | null> => {
  const newClient = {
    ...client,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('clients')
    .insert([newClient])
    .select()
    .single();

  if (error) {
    console.error('Error saving client:', error);
    return null;
  }

  return data;
};

export const updateClient = async (client: Client): Promise<Client | null> => {
  const { data, error } = await supabase
    .from('clients')
    .update({
      ...client,
      updated_at: new Date().toISOString()
    })
    .eq('id', client.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    return null;
  }

  return data;
};

export const deleteClient = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting client:', error);
    return false;
  }

  return true;
};

// Company functions
export const getCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }

  return data || [];
};

export const getCompany = async (id: string): Promise<Company | null> => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching company:', error);
    return null;
  }

  return data;
};

export const saveCompany = async (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company | null> => {
  const newCompany = {
    ...company,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('companies')
    .insert([newCompany])
    .select()
    .single();

  if (error) {
    console.error('Error saving company:', error);
    return null;
  }

  return data;
};

export const updateCompany = async (company: Company): Promise<Company | null> => {
  const { data, error } = await supabase
    .from('companies')
    .update({
      ...company,
      updated_at: new Date().toISOString()
    })
    .eq('id', company.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating company:', error);
    return null;
  }

  return data;
};

export const deleteCompany = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting company:', error);
    return false;
  }

  return true;
};

// Job functions
export const getJobs = async (): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }

  return data || [];
};

export const getJobsByClient = async (clientId: string): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs by client:', error);
    return [];
  }

  return data || [];
};

export const getJob = async (id: string): Promise<Job | null> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching job:', error);
    return null;
  }

  return data;
};

export const saveJob = async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job | null> => {
  const newJob = {
    ...job,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert([newJob])
    .select()
    .single();

  if (error) {
    console.error('Error saving job:', error);
    return null;
  }

  return data;
};

export const updateJob = async (job: Job): Promise<Job | null> => {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      ...job,
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating job:', error);
    return null;
  }

  return data;
};

export const deleteJob = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting job:', error);
    return false;
  }

  return true;
};

// Invoice functions
export const getInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return data || [];
};

export const getInvoicesByClient = async (clientId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices by client:', error);
    return [];
  }

  return data || [];
};

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }

  return data;
};

export const getInvoiceByViewLink = async (viewToken: string): Promise<Invoice | null> => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*),
        client:clients(*),
        job:jobs(*),
        company:companies(*)
      `)
      .eq('view_token', viewToken)
      .single();

    if (error || !invoices) {
      console.error("Error fetching invoice by view token:", error);
      return null;
    }

    const matchingInvoice = invoices;

    // Map invoice items
    const items = matchingInvoice.items.map((item: any) => ({
      id: item.id,
      invoiceId: item.invoice_id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      amount: item.amount
    }));
    
    // Properly cast the status string to the InvoiceStatus type
    let status: InvoiceStatus;
    switch(matchingInvoice.status) {
      case 'draft':
      case 'sent':
      case 'accepted':
      case 'paid':
        status = matchingInvoice.status as InvoiceStatus;
        break;
      default:
        status = 'draft'; // Default fallback if invalid status
    }
    
    // Handle possible undefined contractStatus
    let contractStatus: ContractStatus | undefined = undefined;
    if (matchingInvoice.contract_status) {
      switch(matchingInvoice.contract_status) {
        case 'pending':
        case 'accepted':
          contractStatus = matchingInvoice.contract_status as ContractStatus;
          break;
        default:
          // Keep undefined if not a valid status
          break;
      }
    }
    
    return {
      id: matchingInvoice.id,
      clientId: matchingInvoice.client_id,
      jobId: matchingInvoice.job_id,
      companyId: matchingInvoice.company_id,
      number: matchingInvoice.number,
      issueDate: matchingInvoice.issue_date,
      dueDate: matchingInvoice.due_date,
      status: status,
      contractStatus: contractStatus,
      totalAmount: matchingInvoice.total_amount,
      notes: matchingInvoice.notes,
      items: items,
      createdAt: matchingInvoice.created_at,
      updatedAt: matchingInvoice.updated_at,
      client: matchingInvoice.client ? {
        id: matchingInvoice.client.id,
        name: matchingInvoice.client.name,
        email: matchingInvoice.client.email,
        phone: matchingInvoice.client.phone,
        address: matchingInvoice.client.address,
        createdAt: matchingInvoice.client.created_at,
        updatedAt: matchingInvoice.client.updated_at
      } : undefined,
      job: matchingInvoice.job ? {
        id: matchingInvoice.job.id,
        clientId: matchingInvoice.job.client_id,
        companyId: matchingInvoice.job.company_id,
        title: matchingInvoice.job.title,
        description: matchingInvoice.job.description,
        status: matchingInvoice.job.status,
        date: matchingInvoice.job.date,
        location: matchingInvoice.job.location,
        createdAt: matchingInvoice.job.created_at,
        updatedAt: matchingInvoice.job.updated_at
      } : undefined,
      company: matchingInvoice.company ? {
        id: matchingInvoice.company.id,
        name: matchingInvoice.company.name,
        email: matchingInvoice.company.email,
        phone: matchingInvoice.company.phone,
        address: matchingInvoice.company.address,
        logo: matchingInvoice.company.logo,
        bankDetails: matchingInvoice.company.bank_details,
        taxNumber: matchingInvoice.company.tax_number,
        createdAt: matchingInvoice.company.created_at,
        updatedAt: matchingInvoice.company.updated_at
      } : undefined,
      viewToken: matchingInvoice.view_token
    };
  } catch (error) {
    console.error("Error in getInvoiceByViewLink:", error);
    return null;
  }
};

export const saveInvoice = async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]): Promise<Invoice | null> => {
  const newInvoice = {
    ...invoice,
    id: uuidv4(),
    view_token: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('invoices')
    .insert([newInvoice])
    .select()
    .single();

  if (error) {
    console.error('Error saving invoice:', error);
    return null;
  }

  // Save invoice items
  if (items.length > 0) {
    const invoiceItems = items.map(item => ({
      ...item,
      id: uuidv4(),
      invoice_id: data.id
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error('Error saving invoice items:', itemsError);
      // Consider rolling back the invoice here
      return null;
    }
  }

  return data;
};

export const updateInvoice = async (invoice: Invoice, items: InvoiceItem[]): Promise<Invoice | null> => {
  const { data, error } = await supabase
    .from('invoices')
    .update({
      ...invoice,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoice.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating invoice:', error);
    return null;
  }

  // Delete existing items
  const { error: deleteError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoice.id);

  if (deleteError) {
    console.error('Error deleting invoice items:', deleteError);
    return null;
  }

  // Insert new items
  if (items.length > 0) {
    const invoiceItems = items.map(item => ({
      ...item,
      id: item.id || uuidv4(),
      invoice_id: invoice.id
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error('Error saving invoice items:', itemsError);
      return null;
    }
  }

  return data;
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  // Delete invoice items first
  const { error: itemsError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', id);

  if (itemsError) {
    console.error('Error deleting invoice items:', itemsError);
    return false;
  }

  // Then delete the invoice
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }

  return true;
};
