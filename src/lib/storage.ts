import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Client, Company, Invoice, InvoiceItem, InvoiceStatus, ContractStatus, Job } from '@/types';

// Initialize Supabase client with fallback to demo mode if env vars are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL and Key availability:', {
  urlExists: !!supabaseUrl,
  keyExists: !!supabaseKey
});

// Create a mock client if Supabase credentials are missing
let supabase;
const DEMO_MODE = !supabaseUrl || !supabaseKey;

if (DEMO_MODE) {
  console.log('Running in DEMO MODE - Supabase credentials missing');
  
  // Mock storage for demo mode
  const demoStorage = {
    clients: [],
    companies: [],
    jobs: [],
    invoices: []
  };
  
  // Mock Supabase client
  supabase = {
    from: (table) => ({
      select: () => {
        const mockData = {
          data: demoStorage[table] || [],
          error: null
        };
        
        return {
          eq: () => ({
            single: () => mockData,
            order: () => mockData,
            select: () => mockData
          }),
          order: () => ({
            data: demoStorage[table] || [],
            error: null
          }),
          single: () => mockData
        };
      },
      insert: (items) => {
        const newItems = items.map(item => ({...item, id: item.id || uuidv4()}));
        demoStorage[table] = [...(demoStorage[table] || []), ...newItems];
        return {
          select: () => ({
            single: () => ({
              data: newItems[0],
              error: null
            })
          })
        };
      },
      update: (item) => ({
        eq: () => ({
          select: () => ({
            single: () => ({
              data: item,
              error: null
            })
          })
        })
      }),
      delete: () => ({
        eq: () => ({
          data: null,
          error: null
        })
      })
    })
  };
} else {
  // Real Supabase client
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Client functions
export const getClients = async (companyId?: string): Promise<Client[]> => {
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
export const getJobs = async (companyId?: string): Promise<Job[]> => {
  let query = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query;

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

export const getClientJobs = getJobsByClient;

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
export const getInvoices = async (companyId?: string): Promise<Invoice[]> => {
  console.log('Getting invoices for company:', companyId);
  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  console.log('Fetched invoices:', data?.length || 0);
  return data || [];
};

export const getInvoicesByClient = async (clientId: string): Promise<Invoice[]> => {
  console.log('Getting invoices for client:', clientId);
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices by client:', error);
    return [];
  }

  console.log('Fetched invoices for client:', data?.length || 0);
  return data || [];
};

export const getClientInvoices = getInvoicesByClient;

export const getInvoicesByJob = async (jobId: string): Promise<Invoice[]> => {
  console.log('Getting invoices for job:', jobId);
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices by job:', error);
    return [];
  }

  console.log('Fetched invoices for job:', data?.length || 0);
  return data || [];
};

export const getJobInvoices = getInvoicesByJob;

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  console.log('Getting invoice by ID:', id);
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

  console.log('Fetched invoice:', data?.id);
  return data;
};

export const getInvoiceByViewLink = async (viewToken: string): Promise<Invoice | null> => {
  console.log('Getting invoice by view token:', viewToken);
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

    console.log('Found invoice with view token:', invoices.id);
    const matchingInvoice = invoices;

    // Map invoice items
    const items = matchingInvoice.items.map((item: any) => ({
      id: item.id,
      invoiceId: item.invoice_id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
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
    
    // Create the base invoice object with required fields for the Invoice type
    const invoice: Invoice = {
      id: matchingInvoice.id,
      clientId: matchingInvoice.client_id,
      jobId: matchingInvoice.job_id,
      companyId: matchingInvoice.company_id,
      number: matchingInvoice.number,
      date: matchingInvoice.date,
      dueDate: matchingInvoice.due_date,
      shootingDate: matchingInvoice.shooting_date,
      status: status,
      contractStatus: contractStatus,
      amount: matchingInvoice.amount,
      notes: matchingInvoice.notes,
      contractTerms: matchingInvoice.contract_terms,
      items: items,
      viewLink: matchingInvoice.view_token
    };

    // Store the related entities in session storage for components to use
    console.log('Storing invoice related entities in session storage');
    if (matchingInvoice.client) {
      await storeInvoiceRelatedClient(matchingInvoice.client);
      console.log('Stored client data in session storage');
    }
    
    if (matchingInvoice.job) {
      await storeInvoiceRelatedJob(matchingInvoice.job);
      console.log('Stored job data in session storage');
    }
    
    if (matchingInvoice.company) {
      await storeInvoiceRelatedCompany(matchingInvoice.company);
      console.log('Stored company data in session storage');
    }
    
    return invoice;
  } catch (error) {
    console.error("Error in getInvoiceByViewLink:", error);
    return null;
  }
};

export const saveInvoice = async (invoiceData: Omit<Invoice, 'id' | 'viewLink'>): Promise<Invoice | null> => {
  const newInvoice = {
    ...invoiceData,
    id: uuidv4(),
    view_token: uuidv4(),
    created_at: new Date().toISOString()
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

  return data;
};

export const updateInvoice = async (invoice: Invoice): Promise<Invoice | null> => {
  const { data, error } = await supabase
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

  if (error) {
    console.error('Error updating invoice:', error);
    return null;
  }

  return data;
};

export const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus): Promise<Invoice | null> => {
  const { data, error } = await supabase
    .from('invoices')
    .update({
      status
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating invoice status:', error);
    return null;
  }

  return data;
};

export const updateContractStatus = async (invoiceId: string, contractStatus: ContractStatus): Promise<Invoice | null> => {
  const { data, error } = await supabase
    .from('invoices')
    .update({
      contract_status: contractStatus
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating contract status:', error);
    return null;
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

// Helper functions to store related entities in session storage
const storeInvoiceRelatedClient = async (client: any) => {
  console.log('Storing invoice client data:', client?.id);
  if (!client) return;
  sessionStorage.setItem('current_invoice_client', JSON.stringify({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    createdAt: client.created_at
  }));
};

const storeInvoiceRelatedJob = async (job: any) => {
  console.log('Storing invoice job data:', job?.id);
  if (!job) return;
  sessionStorage.setItem('current_invoice_job', JSON.stringify({
    id: job.id,
    clientId: job.client_id,
    companyId: job.company_id,
    title: job.title,
    description: job.description,
    status: job.status,
    date: job.date,
    location: job.location,
    createdAt: job.created_at,
    updatedAt: job.updated_at
  }));
};

const storeInvoiceRelatedCompany = async (company: any) => {
  console.log('Storing invoice company data:', company?.id);
  if (!company) return;
  sessionStorage.setItem('current_invoice_company', JSON.stringify({
    id: company.id,
    name: company.name,
    email: company.email,
    phone: company.phone,
    address: company.address,
    logoUrl: company.logo_url,
    isDefault: company.is_default,
    userId: company.user_id,
    createdAt: company.created_at,
    updatedAt: company.updated_at
  }));
};

export const isDemoMode = () => DEMO_MODE;
