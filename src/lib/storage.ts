import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase';
import { Client, Company, Invoice, InvoiceItem, Job, InvoiceStatus, ContractStatus } from '@/types';

// =========================
// Clients
// =========================

const getClients = async (): Promise<Client[]> => {
  try {
    const supabase = createClient();
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }

    return clients || [];
  } catch (error) {
    console.error('Error in getClients:', error);
    return [];
  }
};

const getClient = async (id: string): Promise<Client | undefined> => {
  try {
    const supabase = createClient();
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching client:', error);
      return undefined;
    }

    return client || undefined;
  } catch (error) {
    console.error('Error in getClient:', error);
    return undefined;
  }
};

const addClient = async (client: Omit<Client, 'id'>): Promise<Client | null> => {
  try {
    const supabase = createClient();

    const newClient = {
      ...client,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([newClient])
      .select()
      .single();

    if (error) {
      console.error('Error adding client:', error);
      return null;
    }

    return data as Client;
  } catch (error) {
    console.error('Error in addClient:', error);
    return null;
  }
};

const updateClient = async (id: string, updates: Partial<Client>): Promise<Client | null> => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return null;
    }

    return data as Client;
  } catch (error) {
    console.error('Error in updateClient:', error);
    return null;
  }
};

const deleteClient = async (id: string): Promise<boolean> => {
  try {
    const supabase = createClient();
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

// =========================
// Companies
// =========================

const getCompanies = async (): Promise<Company[]> => {
  try {
    const supabase = createClient();
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching companies:', error);
      return [];
    }

    return companies || [];
  } catch (error) {
    console.error('Error in getCompanies:', error);
    return [];
  }
};

const getCompany = async (id: string): Promise<Company | undefined> => {
  try {
    const supabase = createClient();
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching company:', error);
      return undefined;
    }

    return company || undefined;
  } catch (error) {
    console.error('Error in getCompany:', error);
    return undefined;
  }
};

const addCompany = async (company: Omit<Company, 'id'>): Promise<Company | null> => {
  try {
    const supabase = createClient();

    const newCompany = {
      ...company,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('companies')
      .insert([newCompany])
      .select()
      .single();

    if (error) {
      console.error('Error adding company:', error);
      return null;
    }

    return data as Company;
  } catch (error) {
    console.error('Error in addCompany:', error);
    return null;
  }
};

const updateCompany = async (id: string, updates: Partial<Company>): Promise<Company | null> => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating company:', error);
      return null;
    }

    return data as Company;
  } catch (error) {
    console.error('Error in updateCompany:', error);
    return null;
  }
};

const deleteCompany = async (id: string): Promise<boolean> => {
  try {
    const supabase = createClient();
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
    console.error('Error in deleteCompany:', error);
    return false;
  }
};

// =========================
// Jobs
// =========================

const getJobs = async (): Promise<Job[]> => {
  try {
    const supabase = createClient();
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }

    return jobs || [];
  } catch (error) {
    console.error('Error in getJobs:', error);
    return [];
  }
};

const getJob = async (id: string): Promise<Job | undefined> => {
  try {
    const supabase = createClient();
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching job:', error);
      return undefined;
    }

    return job || undefined;
  } catch (error) {
    console.error('Error in getJob:', error);
    return undefined;
  }
};

const addJob = async (job: Omit<Job, 'id'>): Promise<Job | null> => {
  try {
    const supabase = createClient();

    const newJob = {
      ...job,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert([newJob])
      .select()
      .single();

    if (error) {
      console.error('Error adding job:', error);
      return null;
    }

    return data as Job;
  } catch (error) {
    console.error('Error in addJob:', error);
    return null;
  }
};

const updateJob = async (id: string, updates: Partial<Job>): Promise<Job | null> => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating job:', error);
      return null;
    }

    return data as Job;
  } catch (error) {
    console.error('Error in updateJob:', error);
    return null;
  }
};

const deleteJob = async (id: string): Promise<boolean> => {
  try {
    const supabase = createClient();
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

// =========================
// Invoices
// =========================

const getInvoices = async (): Promise<Invoice[]> => {
    try {
      const supabase = createClient();
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
  
      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
  
      return invoices || [];
    } catch (error) {
      console.error('Error in getInvoices:', error);
      return [];
    }
  };
  
  const addInvoice = async (invoice: Omit<Invoice, 'id'>): Promise<Invoice | null> => {
    try {
      const supabase = createClient();
  
      const newInvoice = {
        ...invoice,
        id: uuidv4(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
  
      const { data, error } = await supabase
        .from('invoices')
        .insert([newInvoice])
        .select()
        .single();
  
      if (error) {
        console.error('Error adding invoice:', error);
        return null;
      }
  
      return data as Invoice;
    } catch (error) {
      console.error('Error in addInvoice:', error);
      return null;
    }
  };
  
  const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<Invoice | null> => {
    try {
      const supabase = createClient();
  
      const { data, error } = await supabase
        .from('invoices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
  
      if (error) {
        console.error('Error updating invoice:', error);
        return null;
      }
  
      return data as Invoice;
    } catch (error) {
      console.error('Error in updateInvoice:', error);
      return null;
    }
  };
  
  const deleteInvoice = async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
  
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

// Fix the type assignment for InvoiceStatus and ContractStatus in the getInvoice function
const getInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*, job_id')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    // Convert the database record to an Invoice object
    const invoice: Invoice = {
      id: data.id,
      jobId: data.job_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      number: data.number,
      date: data.date,
      dueDate: data.due_date,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      notes: data.notes,
      status: data.status as InvoiceStatus,
      contract_status: data.contract_status as ContractStatus,
      viewLink: data.view_link,
      items: data.items || [],
    };
    
    return invoice;
  } catch (error) {
    console.error('Error in getInvoice:', error);
    return null;
  }
};

export {
    getClients,
    getClient,
    addClient,
    updateClient,
    deleteClient,
    getCompanies,
    getCompany,
    addCompany,
    updateCompany,
    deleteCompany,
    getJobs,
    getJob,
    addJob,
    updateJob,
    deleteJob,
    getInvoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoice
}
