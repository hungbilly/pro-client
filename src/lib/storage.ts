import { Client, Invoice, STORAGE_KEYS, InvoiceItem, Job, Company, InvoiceStatus, ContractStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Helper function to safely parse enum values
function parseEnum<T extends string>(value: string | null | undefined, enumValues: T[], defaultValue: T): T {
  if (!value) {
    return defaultValue;
  }
  if (enumValues.includes(value as T)) {
    return value as T;
  }
  return defaultValue;
}

// Generate a unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Generate a unique viewLink for invoices
export const generateViewLink = (): string => {
  return `${window.location.origin}/invoice/${generateId()}`;
};

// Company operations
export const getCompanies = async (): Promise<Company[]> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');
    
    if (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
};

export const getDefaultCompany = async (): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_default', true)
      .single();
    
    if (error || !data) {
      // If no default company, try to get any company
      const { data: anyCompany, error: anyError } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single();
      
      if (anyError || !anyCompany) {
        return null;
      }
      
      return anyCompany;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching default company:', error);
    return null;
  }
};

export const saveCompany = async (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> => {
  try {
    // If this is set as default, update other companies first
    if (company.is_default) {
      const { error: updateError } = await supabase
        .from('companies')
        .update({ is_default: false })
        .neq('user_id', company.user_id); // Just to have a condition, will update all rows
      
      if (updateError) {
        console.error('Error updating other companies:', updateError);
      }
    }
    
    // Now insert the new company
    const { data, error } = await supabase
      .from('companies')
      .insert({
        user_id: company.user_id,
        name: company.name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        logo_url: company.logo_url,
        is_default: company.is_default
      })
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error saving company:', error);
      throw new Error(error?.message || 'Failed to save company');
    }
    
    return data;
  } catch (error) {
    console.error('Error saving company:', error);
    throw error;
  }
};

export const updateCompany = async (company: Company): Promise<Company> => {
  try {
    // If this is set as default, update other companies first
    if (company.is_default) {
      const { error: updateError } = await supabase
        .from('companies')
        .update({ is_default: false })
        .neq('id', company.id);
      
      if (updateError) {
        console.error('Error updating other companies:', updateError);
      }
    }
    
    // Now update the company
    const { data, error } = await supabase
      .from('companies')
      .update({
        name: company.name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        logo_url: company.logo_url,
        is_default: company.is_default,
        updated_at: new Date().toISOString()
      })
      .eq('id', company.id)
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error updating company:', error);
      throw new Error(error?.message || 'Failed to update company');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating company:', error);
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
      console.error('Error deleting company:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
};

// Client operations
export const getClients = async (companyId?: string | null) => {
  try {
    let query = supabase.from('clients').select('*');
    
    // If companyId is provided, filter by it
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
    
    return data?.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes || undefined,
      createdAt: client.created_at,
      companyId: client.company_id
    })) || [];
  } catch (error) {
    console.error('Error in getClients:', error);
    throw error;
  }
};

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
      notes: data.notes || undefined,
      createdAt: data.created_at,
      companyId: data.company_id
    };
  } catch (error) {
    console.error('Error fetching client:', error);
    return undefined;
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
      notes: data.notes || undefined,
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
      notes: data.notes || undefined,
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
    // Supabase will cascade delete all associated invoices and invoice items
    // because we set up the foreign key constraints with ON DELETE CASCADE
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

// Job operations
export const getJobs = async (companyId?: string | null) => {
  try {
    let query = supabase.from('jobs').select('*');
    
    // If companyId is provided, filter by it
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }
    
    return data?.map(job => ({
      id: job.id,
      clientId: job.client_id,
      companyId: job.company_id,
      title: job.title,
      description: job.description || undefined,
      status: job.status as 'active' | 'completed' | 'cancelled',
      date: job.date || undefined,
      location: job.location || undefined,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    })) || [];
  } catch (error) {
    console.error('Error in getJobs:', error);
    throw error;
  }
};

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
      description: data.description || undefined,
      status: data.status as 'active' | 'completed' | 'cancelled',
      date: data.date || undefined,
      location: data.location || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error fetching job:', error);
    return undefined;
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
    
    return data.map(job => ({
      id: job.id,
      clientId: job.client_id,
      companyId: job.company_id,
      title: job.title,
      description: job.description || undefined,
      status: job.status as 'active' | 'completed' | 'cancelled',
      date: job.date || undefined,
      location: job.location || undefined,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    }));
  } catch (error) {
    console.error('Error fetching client jobs:', error);
    return [];
  }
};

export const getJobInvoices = async (jobId: string): Promise<Invoice[]> => {
  try {
    // First get all invoices for the job
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId);
    
    if (invoicesError || !invoicesData || invoicesData.length === 0) {
      if (invoicesError) console.error('Error fetching job invoices:', invoicesError);
      return [];
    }
    
    // Get all invoice IDs
    const invoiceIds = invoicesData.map(invoice => invoice.id);
    
    // Then get all invoice items for these invoices
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .in('invoice_id', invoiceIds);
    
    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      // Continue with empty items if there was an error
    }
    
    // Map and transform the data
    return invoicesData.map(invoice => {
      const invoiceItems = (itemsData || [])
        .filter(item => item.invoice_id === invoice.id)
        .map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        }));
      
      return {
        id: invoice.id,
        clientId: invoice.client_id,
        companyId: invoice.company_id,
        jobId: invoice.job_id || undefined,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        dueDate: invoice.due_date,
        shootingDate: invoice.shooting_date || undefined,
        status: invoice.status as InvoiceStatus,
        contractStatus: invoice.contract_status as ContractStatus || undefined,
        items: invoiceItems,
        notes: invoice.notes || undefined,
        contractTerms: invoice.contract_terms || undefined,
        viewLink: invoice.view_link
      };
    });
  } catch (error) {
    console.error('Error fetching job invoices:', error);
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
        location: job.location
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
      description: data.description || undefined,
      status: data.status as 'active' | 'completed' | 'cancelled',
      date: data.date || undefined,
      location: data.location || undefined,
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
      description: data.description || undefined,
      status: data.status as 'active' | 'completed' | 'cancelled',
      date: data.date || undefined,
      location: data.location || undefined,
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

// Invoice operations
export const getInvoices = async (companyId?: string | null) => {
  try {
    let query = supabase.from('invoices').select('*, invoice_items(*)');
    
    // If companyId is provided, filter by it
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
    
    // Transform the data to match our type
    const invoices = (data || []).map(invoice => {
      const items = invoice.invoice_items.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      }));
      
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
        items,
        notes: invoice.notes,
        contractTerms: invoice.contract_terms,
        viewLink: invoice.view_link
      };
    });
    
    return invoices;
  } catch (error) {
    console.error('Error in getInvoices:', error);
    throw error;
  }
};

export const getInvoicesByDate = async (date?: string): Promise<Invoice[]> => {
  try {
    let query = supabase.from('invoices').select('*, invoice_items(*)');
    
    // If date is provided, filter by it
    if (date) {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching invoices by date:', error);
      throw error;
    }
    
    // Transform the data to match our type
    const invoices = (data || []).map(invoice => {
      const items = invoice.invoice_items.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      }));
      
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
        items,
        notes: invoice.notes,
        contractTerms: invoice.contract_terms,
        viewLink: invoice.view_link
      };
    });
    
    return invoices;
  } catch (error) {
    console.error('Error in getInvoicesByDate:', error);
    return [];
  }
};

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
    
    // Map and transform the data
    const invoiceItems = itemsData.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));
    
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
      viewLink: invoice.view_link
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return undefined;
  }
};

export const getInvoiceByViewLink = async (viewLink: string): Promise<Invoice | undefined> => {
  try {
    console.log('Searching for invoice with view_link:', viewLink);
    // Try a simple query without the exact matching to see if we can find any invoices with similar view links
    const { data: allInvoices, error: invoiceQueryError } = await supabase
      .from('invoices')
      .select('*');
    
    if (invoiceQueryError) {
      console.error('Error querying invoices:', invoiceQueryError);
      return undefined;
    }
    
    console.log('Found invoices:', allInvoices?.map(inv => inv.view_link));
    
    // Try to find an invoice with a matching view_link
    const matchingInvoice = allInvoices?.find(inv => 
      inv.view_link === viewLink || 
      inv.view_link.includes(viewLink) || 
      viewLink.includes(inv.view_link.split('/').pop() || '')
    );
    
    if (!matchingInvoice) {
      console.error('No invoice found with matching view link');
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
    
    // Map and transform the data
    const invoiceItems = (itemsData || []).map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
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
      status,
      contractStatus,
      items: invoiceItems,
      notes: matchingInvoice.notes,
      contractTerms: matchingInvoice.contract_terms,
      viewLink: matchingInvoice.view_link
    };
  } catch (error) {
    console.error('Error in getInvoiceByViewLink:', error);
    return undefined;
  }
};

export const getClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  try {
    // Fetch invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select()
      .eq('client_id', clientId);
    
    if (invoicesError) {
      console.error('Error fetching client invoices:', invoicesError);
      return [];
    }
    
    if (!invoicesData || invoicesData.length === 0) {
      return [];
    }
    
    // Fetch invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select()
      .in('invoice_id', invoicesData.map(invoice => invoice.id));
    
    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
    }
    
    // Map and transform the data
    return invoicesData.map(invoice => {
      const invoiceItems = (itemsData || [])
        .filter(item => item.invoice_id === invoice.id)
        .map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        }));

      // Using parseEnum to safely cast string values to their respective enum types
      const status = parseEnum(
        invoice.status,
        ['draft', 'sent', 'accepted', 'paid'],
        'draft'
      ) as InvoiceStatus;
      
      const contractStatus = invoice.contract_status
        ? parseEnum(
            invoice.contract_status,
            ['pending', 'accepted'],
            'pending'
          ) as ContractStatus
        : undefined;

      return {
        id: invoice.id,
        clientId: invoice.client_id,
        companyId: invoice.company_id,
        jobId: invoice.job_id,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        dueDate: invoice.due_date,
        status,
        contractStatus,
        items: invoiceItems,
        notes: invoice.notes,
        contractTerms: invoice.contract_terms,
        viewLink: invoice.view_link
      };
    });
  } catch (error) {
    console.error('Error in getClientInvoices:', error);
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
    
    // Insert invoice items
    const invoiceItems = invoice.items.map(item => ({
      invoice_id: newInvoice.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));
    
    const { data: newItems, error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)
      .select();
    
    if (itemsError) {
      console.error('Error saving invoice items:', itemsError);
      // Try to cleanup the invoice
      await supabase.from('invoices').delete().eq('id', newInvoice.id);
      throw new Error(itemsError.message);
    }
    
    // Map the items to the expected format
    const items: InvoiceItem[] = (newItems || []).map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));
    
    // Return the complete invoice object
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
      contractStatus: newInvoice.contract_status as ContractStatus | undefined,
      items,
      notes: newInvoice.notes,
      contractTerms: newInvoice.contract_terms,
      viewLink: newInvoice.view_link
    };
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
};

export const updateInvoice = async (invoice: Invoice): Promise<Invoice> => {
  try {
    // Update the invoice
    const { error: invoiceError } = await supabase
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
        contract_terms: invoice.contractTerms,
        view_link: invoice.viewLink
      })
      .eq('id', invoice.id);
    
    if (invoiceError) {
      console.error('Error updating invoice:', invoiceError);
      throw new Error(invoiceError.message);
    }
    
    // Delete existing invoice items
    const { error: deleteError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoice.id);
    
    if (deleteError) {
      console.error('Error deleting existing invoice items:', deleteError);
      throw new Error(deleteError.message);
    }
    
    // Insert updated invoice items
    const invoiceItems = invoice.items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);
    
    if (itemsError) {
      console.error('Error updating invoice items:', itemsError);
      throw new Error(itemsError.message);
    }
    
    return invoice;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

export const updateInvoiceStatus = async (id: string, status: Invoice['status']): Promise<Invoice | undefined> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error updating invoice status:', error);
      return undefined;
    }
    
    // Get the full invoice with items
    return await getInvoice(id);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    return undefined;
  }
};

export const updateContractStatus = async (id: string, contractStatus: 'pending' | 'accepted'): Promise<Invoice | undefined> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({ contract_status: contractStatus })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      console.error('Error updating contract status:', error);
      return undefined;
    }
    
    // Get the full invoice with items
    return await getInvoice(id);
  } catch (error) {
    console.error('Error updating contract status:', error);
    return undefined;
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    // Delete the invoice (items will be cascade deleted)
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting invoice:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};
