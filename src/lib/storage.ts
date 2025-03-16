import { Client, Invoice, STORAGE_KEYS, InvoiceItem, Job, Company, InvoiceStatus, ContractStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export const getClients = async (): Promise<Client[]> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching clients:', error);
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
      console.error('Error fetching client:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching client:', error);
    return null;
  }
};

export const saveClient = async (client: Omit<Client, 'id' | 'createdAt'>): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          ...client,
          company_id: client.companyId
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error saving client:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error saving client:', error);
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
      .select('*')
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating client:', error);
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
    console.error('Error deleting client:', error);
    return false;
  }
};

export const getJobs = async (): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching jobs:', error);
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

    return data;
  } catch (error) {
    console.error('Error fetching job:', error);
    return null;
  }
};

export const saveJob = async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job | null> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert([
        {
          ...job,
          client_id: job.clientId,
          company_id: job.companyId
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error saving job:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error saving job:', error);
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
        updated_at: job.updatedAt
      })
      .eq('id', job.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating job:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating job:', error);
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
    console.error('Error deleting job:', error);
    return false;
  }
};

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    // First get all invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (invoicesError || !invoicesData || invoicesData.length === 0) {
      if (invoicesError) console.error('Error fetching invoices:', invoicesError);
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

    // In the transformed results, explicitly cast the status and contractStatus to the correct types
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
        contractStatus: (invoice.contract_status as ContractStatus) || undefined,
        items: invoiceItems,
        notes: invoice.notes || undefined,
        contractTerms: invoice.contract_terms || undefined,
        viewLink: invoice.view_link
      };
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
};

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (invoiceError || !invoiceData) {
      if (invoiceError) console.error('Error fetching invoice:', invoiceError);
      return null;
    }
    
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);
    
    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      // Continue with empty items if there was an error
    }
    
    const invoiceItems = (itemsData || []).map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount
    }));
    
    return {
      id: invoiceData.id,
      clientId: invoiceData.client_id,
      companyId: invoiceData.company_id,
      jobId: invoiceData.job_id || undefined,
      number: invoiceData.number,
      amount: invoiceData.amount,
      date: invoiceData.date,
      dueDate: invoiceData.due_date,
      shootingDate: invoiceData.shooting_date || undefined,
      status: invoiceData.status as InvoiceStatus,
      contractStatus: (invoiceData.contract_status as ContractStatus) || undefined,
      items: invoiceItems,
      notes: invoiceData.notes || undefined,
      contractTerms: invoiceData.contract_terms || undefined,
      viewLink: invoiceData.view_link
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
};

export const saveInvoice = async (invoice: Omit<Invoice, 'id'>): Promise<Invoice | null> => {
  try {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert([
        {
          client_id: invoice.clientId,
          company_id: invoice.companyId,
          job_id: invoice.jobId || null,
          number: invoice.number,
          amount: invoice.amount,
          date: invoice.date,
          due_date: invoice.dueDate,
          shooting_date: invoice.shootingDate || null,
          status: invoice.status,
          contract_status: invoice.contractStatus || null,
          notes: invoice.notes || null,
          contract_terms: invoice.contractTerms || null,
          view_link: invoice.viewLink
        }
      ])
      .select('*')
      .single();
    
    if (invoiceError || !invoiceData) {
      console.error('Error saving invoice:', invoiceError);
      return null;
    }
    
    // If there are items, save them
    if (invoice.items && invoice.items.length > 0) {
      const itemsToInsert = invoice.items.map(item => ({
        invoice_id: invoiceData.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
      
      if (itemsError) {
        console.error('Error saving invoice items:', itemsError);
        // Depending on your error handling strategy, you might want to return an error or try to recover
        return null;
      }
    }
    
    return {
      ...invoiceData,
      clientId: invoiceData.client_id,
      companyId: invoiceData.company_id,
      jobId: invoiceData.job_id || undefined,
      status: invoiceData.status as InvoiceStatus,
      contractStatus: (invoiceData.contract_status as ContractStatus) || undefined,
      items: invoice.items || []
    };
  } catch (error) {
    console.error('Error saving invoice:', error);
    return null;
  }
};

export const updateInvoice = async (invoice: Invoice): Promise<Invoice | null> => {
  try {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        client_id: invoice.clientId,
        company_id: invoice.companyId,
        job_id: invoice.jobId || null,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        due_date: invoice.dueDate,
        shooting_date: invoice.shootingDate || null,
        status: invoice.status,
        contract_status: invoice.contractStatus || null,
        notes: invoice.notes || null,
        contract_terms: invoice.contractTerms || null,
        view_link: invoice.viewLink
      })
      .eq('id', invoice.id)
      .select('*')
      .single();
    
    if (invoiceError || !invoiceData) {
      console.error('Error updating invoice:', invoiceError);
      return null;
    }
    
    // First, delete existing items
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoice.id);
    
    if (deleteItemsError) {
      console.error('Error deleting existing invoice items:', deleteItemsError);
      return null;
    }
    
    // Then, insert the updated items
    if (invoice.items && invoice.items.length > 0) {
      const itemsToInsert = invoice.items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
      
      if (itemsError) {
        console.error('Error saving invoice items:', itemsError);
        return null;
      }
    }
    
    return {
      ...invoiceData,
      clientId: invoiceData.client_id,
      companyId: invoiceData.company_id,
      jobId: invoiceData.job_id || undefined,
      status: invoiceData.status as InvoiceStatus,
      contractStatus: (invoiceData.contract_status as ContractStatus) || undefined,
      items: invoice.items || []
    };
  } catch (error) {
    console.error('Error updating invoice:', error);
    return null;
  }
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  try {
    // First, delete invoice items
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);
    
    if (deleteItemsError) {
      console.error('Error deleting invoice items:', deleteItemsError);
      return false;
    }
    
    // Then, delete the invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (invoiceError) {
      console.error('Error deleting invoice:', invoiceError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
};

export const getClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  try {
    // First get all invoices for the client
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId);
    
    if (invoicesError || !invoicesData || invoicesData.length === 0) {
      if (invoicesError) console.error('Error fetching client invoices:', invoicesError);
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
        contractStatus: (invoice.contract_status as ContractStatus) || undefined,
        items: invoiceItems,
        notes: invoice.notes || undefined,
        contractTerms: invoice.contract_terms || undefined,
        viewLink: invoice.view_link
      };
    });
  } catch (error) {
    console.error('Error fetching client invoices:', error);
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
        contractStatus: (invoice.contract_status as ContractStatus) || undefined,
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

export const getCompanies = async (): Promise<Company[]> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

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

export const getCompany = async (id: string): Promise<Company | null> => {
  try {
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
  } catch (error) {
    console.error('Error fetching company:', error);
    return null;
  }
};

export const saveCompany = async (company: Omit<Company, 'id' | 'createdAt'>): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .insert([company])
      .select('*')
      .single();

    if (error) {
      console.error('Error saving company:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error saving company:', error);
    return null;
  }
};

export const updateCompany = async (company: Company): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .update({
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        notes: company.notes
      })
      .eq('id', company.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating company:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating company:', error);
    return null;
  }
};

export const deleteCompany = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting company:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting company:', error);
    return false;
  }
};
