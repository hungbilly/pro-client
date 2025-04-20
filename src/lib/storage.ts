import { v4 as uuidv4 } from 'uuid';
import { Client, Company, Invoice, InvoiceItem, Job, InvoiceTemplate, PaymentSchedule, PaymentStatus } from '@/types';
import { supabase } from "@/integrations/supabase/client";

// Function to map invoice data from the database to the Invoice interface
const mapInvoiceFromDatabase = (data: any): Invoice => ({
  id: data.id,
  clientId: data.client_id,
  companyId: data.company_id,
  jobId: data.job_id,
  number: data.number,
  amount: data.amount,
  date: data.date,
  dueDate: data.due_date,
  status: data.status as 'draft' | 'sent' | 'accepted' | 'paid',
  contractStatus: data.contract_status as 'pending' | 'accepted',
  items: data.items || [],
  notes: data.notes,
  contractTerms: data.contract_terms,
  viewLink: data.view_link,
  paymentSchedules: data.payment_schedules,
  shootingDate: data.shooting_date,
  pdfUrl: data.pdf_url,
  templateId: data.template_id,
  contractAcceptedAt: data.contract_accepted_at,
  invoiceAcceptedAt: data.invoice_accepted_at,
});

// Function to create a new client
export const createClient = async (client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
  try {
    const newClient: Client = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...client,
    };

    // Insert the new client into the database
    const { error } = await supabase
      .from('clients')
      .insert([
        {
          id: newClient.id,
          created_at: newClient.createdAt,
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone,
          address: newClient.address,
          notes: newClient.notes,
          company_id: newClient.companyId,
        },
      ]);

    if (error) {
      throw error;
    }

    return newClient;
  } catch (err) {
    console.error('Error creating client:', err);
    throw err;
  }
};

// Function to fetch a client by ID
export const getClient = async (id: string): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        createdAt: data.created_at,
        companyId: data.company_id,
      };
    }

    return null;
  } catch (err) {
    console.error('Error fetching client:', err);
    return null;
  }
};

// Function to update an existing client
export const updateClient = async (client: Client): Promise<Client> => {
  try {
    const { error } = await supabase
      .from('clients')
      .update({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
        company_id: client.companyId,
      })
      .eq('id', client.id);

    if (error) {
      throw error;
    }

    return client;
  } catch (err) {
    console.error('Error updating client:', err);
    throw err;
  }
};

// Function to delete a client by ID
export const deleteClient = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error deleting client:', err);
    throw err;
  }
};

// Function to fetch all clients for a specific company
export const getClients = async (companyId: string): Promise<Client[]> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', companyId);

    if (error) {
      throw error;
    }

    return data.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      createdAt: client.created_at,
      companyId: client.company_id,
    }));
  } catch (err) {
    console.error('Error fetching clients:', err);
    return [];
  }
};

// Function to create a new company
export const createCompany = async (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> => {
  try {
    const newCompany: Company = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...company,
    };

    // Insert the new company into the database
    const { error } = await supabase
      .from('companies')
      .insert([
        {
          id: newCompany.id,
          created_at: newCompany.created_at,
          updated_at: newCompany.updated_at,
          name: newCompany.name,
          address: newCompany.address,
          phone: newCompany.phone,
          email: newCompany.email,
          website: newCompany.website,
          logo_url: newCompany.logo_url,
          country: newCompany.country,
          currency: newCompany.currency,
          timezone: newCompany.timezone,
          is_default: newCompany.is_default,
          user_id: newCompany.user_id,
        },
      ]);

    if (error) {
      throw error;
    }

    return newCompany;
  } catch (err) {
    console.error('Error creating company:', err);
    throw err;
  }
};

// Function to get a company by ID
export const getCompany = async (id: string): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      return {
        id: data.id,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        logo_url: data.logo_url,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
        is_default: data.is_default,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }

    return null;
  } catch (err) {
    console.error('Error fetching company:', err);
    return null;
  }
};

// Function to update an existing company
export const updateCompany = async (company: Company): Promise<Company> => {
  try {
    const { error } = await supabase
      .from('companies')
      .update({
        name: company.name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        logo_url: company.logo_url,
        country: company.country,
        currency: company.currency,
        timezone: company.timezone,
        is_default: company.is_default,
        user_id: company.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', company.id);

    if (error) {
      throw error;
    }

    return company;
  } catch (err) {
    console.error('Error updating company:', err);
    throw err;
  }
};

// Function to delete a company by ID
export const deleteCompany = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error deleting company:', err);
    throw err;
  }
};

// Function to fetch all companies for a specific user
export const getCompanies = async (userId: string): Promise<Company[]> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return data.map(company => ({
      id: company.id,
      name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      logo_url: company.logo_url,
      country: company.country,
      currency: company.currency,
      timezone: company.timezone,
      is_default: company.is_default,
      user_id: company.user_id,
      created_at: company.created_at,
      updated_at: company.updated_at,
    }));
  } catch (err) {
    console.error('Error fetching companies:', err);
    return [];
  }
};

// Function to create a new job
export const createJob = async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
  try {
    const newJob: Job = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...job,
    };

    // Insert the new job into the database
    const { error } = await supabase
      .from('jobs')
      .insert([
        {
          id: newJob.id,
          client_id: newJob.clientId,
          company_id: newJob.companyId,
          title: newJob.title,
          description: newJob.description,
          status: newJob.status,
          date: newJob.date,
          location: newJob.location,
          start_time: newJob.startTime,
          end_time: newJob.endTime,
          is_full_day: newJob.isFullDay,
          created_at: newJob.createdAt,
          updated_at: newJob.updatedAt,
          calendar_event_id: newJob.calendarEventId,
          timezone: newJob.timezone,
        },
      ]);

    if (error) {
      throw error;
    }

    return newJob;
  } catch (err) {
    console.error('Error creating job:', err);
    throw err;
  }
};

// Function to fetch a job by ID
export const getJob = async (id: string): Promise<Job | null> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
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
        timezone: data.timezone,
      };
    }

    return null;
  } catch (err) {
    console.error('Error fetching job:', err);
    return null;
  }
};

// Function to update an existing job
export const updateJob = async (job: Job): Promise<Job> => {
  try {
    const { error } = await supabase
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
        updated_at: new Date().toISOString(),
        calendar_event_id: job.calendarEventId,
        timezone: job.timezone,
      })
      .eq('id', job.id);

    if (error) {
      throw error;
    }

    return job;
  } catch (err) {
    console.error('Error updating job:', err);
    throw err;
  }
};

// Function to delete a job by ID
export const deleteJob = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error deleting job:', err);
    throw err;
  }
};

// Function to fetch all jobs for a specific company
export const getJobs = async (companyId: string): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId);

    if (error) {
      throw error;
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
      timezone: job.timezone,
    }));
  } catch (err) {
    console.error('Error fetching jobs:', err);
    return [];
  }
};

// Function to create a new invoice
export const createInvoice = async (invoice: Omit<Invoice, 'id' | 'viewLink'>): Promise<Invoice> => {
  try {
    const newInvoice: Invoice = {
      id: uuidv4(),
      viewLink: uuidv4(),
      ...invoice,
    };

    // Insert the new invoice into the database
    const { error } = await supabase
      .from('invoices')
      .insert([
        {
          id: newInvoice.id,
          client_id: newInvoice.clientId,
          company_id: newInvoice.companyId,
          job_id: newInvoice.jobId,
          number: newInvoice.number,
          amount: newInvoice.amount,
          date: newInvoice.date,
          due_date: newInvoice.dueDate,
          status: newInvoice.status,
          contract_status: newInvoice.contractStatus,
          items: newInvoice.items,
          notes: newInvoice.notes,
          contract_terms: newInvoice.contractTerms,
          view_link: newInvoice.viewLink,
          payment_schedules: newInvoice.paymentSchedules,
          shooting_date: newInvoice.shootingDate,
          template_id: newInvoice.templateId,
        },
      ]);

    if (error) {
      throw error;
    }

    return newInvoice;
  } catch (err) {
    console.error('Error creating invoice:', err);
    throw err;
  }
};

// Function to fetch an invoice by ID
export const getInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      return mapInvoiceFromDatabase(data);
    }

    return null;
  } catch (err) {
    console.error('Error fetching invoice:', err);
    return null;
  }
};

// Function to fetch an invoice by view link
export const getInvoiceByViewLink = async (viewLink: string): Promise<Invoice | null> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('view_link', viewLink)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      return mapInvoiceFromDatabase(data);
    }

    return null;
  } catch (err) {
    console.error('Error fetching invoice by view link:', err);
    return null;
  }
};

// Function to update an existing invoice
export const updateInvoice = async (invoice: Invoice): Promise<Invoice> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({
        client_id: invoice.clientId,
        company_id: invoice.companyId,
        job_id: invoice.jobId,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        due_date: invoice.dueDate,
        status: invoice.status,
        contract_status: invoice.contractStatus,
        items: invoice.items,
        notes: invoice.notes,
        contract_terms: invoice.contractTerms,
        view_link: invoice.viewLink,
        payment_schedules: invoice.paymentSchedules,
        shooting_date: invoice.shootingDate,
        template_id: invoice.templateId,
        contract_accepted_at: invoice.contractAcceptedAt,
        invoice_accepted_at: invoice.invoiceAcceptedAt,
      })
      .eq('id', invoice.id);

    if (error) {
      throw error;
    }

    return invoice;
  } catch (err) {
    console.error('Error updating invoice:', err);
    throw err;
  }
};

// Function to update invoice status
export const updateInvoiceStatus = async (invoiceId: string, status: 'draft' | 'sent' | 'accepted' | 'paid'): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: status,
        invoice_accepted_at: status === 'accepted' ? new Date().toISOString() : null
      })
      .eq('id', invoiceId);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error updating invoice status:', err);
    throw err;
  }
};

// Function to delete an invoice by ID
export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error deleting invoice:', err);
    throw err;
  }
};

// Function to fetch all invoices for a specific company
export const getInvoices = async (companyId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId);

    if (error) {
      throw error;
    }

    return data.map(mapInvoiceFromDatabase);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return [];
  }
};

// Function to create a new invoice template
export const createInvoiceTemplate = async (invoiceTemplate: Omit<InvoiceTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<InvoiceTemplate> => {
  try {
    const newInvoiceTemplate: InvoiceTemplate = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...invoiceTemplate,
    };

    // Insert the new invoice template into the database
    const { error } = await supabase
      .from('invoice_templates')
      .insert([
        {
          id: newInvoiceTemplate.id,
          name: newInvoiceTemplate.name,
          description: newInvoiceTemplate.description,
          items: newInvoiceTemplate.items,
          contract_terms: newInvoiceTemplate.contractTerms,
          notes: newInvoiceTemplate.notes,
          company_id: newInvoiceTemplate.companyId,
          user_id: newInvoiceTemplate.userId,
          created_at: newInvoiceTemplate.created_at,
          updated_at: newInvoiceTemplate.updated_at,
          content: newInvoiceTemplate.content,
        },
      ]);

    if (error) {
      throw error;
    }

    return newInvoiceTemplate;
  } catch (err) {
    console.error('Error creating invoice template:', err);
    throw err;
  }
};

// Function to fetch an invoice template by ID
export const getInvoiceTemplate = async (id: string): Promise<InvoiceTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        items: data.items,
        contractTerms: data.contract_terms,
        notes: data.notes,
        companyId: data.company_id,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        company_id: data.company_id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }

    return null;
  } catch (err) {
    console.error('Error fetching invoice template:', err);
    return null;
  }
};

// Function to update an existing invoice template
export const updateInvoiceTemplate = async (invoiceTemplate: InvoiceTemplate): Promise<InvoiceTemplate> => {
  try {
    const { error } = await supabase
      .from('invoice_templates')
      .update({
        name: invoiceTemplate.name,
        description: invoiceTemplate.description,
        items: invoiceTemplate.items,
        contract_terms: invoiceTemplate.contractTerms,
        notes: invoiceTemplate.notes,
        company_id: invoiceTemplate.companyId,
        user_id: invoiceTemplate.userId,
        content: invoiceTemplate.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceTemplate.id);

    if (error) {
      throw error;
    }

    return invoiceTemplate;
  } catch (err) {
    console.error('Error updating invoice template:', err);
    throw err;
  }
};

// Function to delete an invoice template by ID
export const deleteInvoiceTemplate = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoice_templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error deleting invoice template:', err);
    throw err;
  }
};

// Function to fetch all invoice templates for a specific company
export const getInvoiceTemplates = async (companyId: string): Promise<InvoiceTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('company_id', companyId);

    if (error) {
      throw error;
    }

    return data.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      items: template.items,
      contractTerms: template.contract_terms,
      notes: template.notes,
      companyId: template.company_id,
      userId: template.user_id,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      company_id: template.company_id,
      user_id: template.user_id,
      content: template.content,
      created_at: template.created_at,
      updated_at: template.updated_at,
    }));
  } catch (err) {
    console.error('Error fetching invoice templates:', err);
    return [];
  }
};

// Add these missing functions for contract and payment status updates
export const updateContractStatus = async (invoiceId: string, status: 'pending' | 'accepted'): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ 
        contract_status: status,
        contract_accepted_at: status === 'accepted' ? new Date().toISOString() : null
      })
      .eq('id', invoiceId);
      
    if (error) throw error;
  } catch (err) {
    console.error('Error updating contract status:', err);
    throw err;
  }
};

export const updatePaymentScheduleStatus = async (
  paymentId: string, 
  status: 'pending' | 'paid' | 'overdue' | 'unpaid' | 'write-off',
  paymentDate?: string
): Promise<PaymentSchedule | null> => {
  try {
    const updateData: {
      status: string;
      payment_date?: string | null;
    } = { status };
    
    if (status === 'paid' && paymentDate) {
      updateData.payment_date = paymentDate;
    } else if (status !== 'paid') {
      updateData.payment_date = null;
    }
    
    const { data, error } = await supabase
      .from('payment_schedules')
      .update(updateData)
      .eq('id', paymentId)
      .select('*')
      .single();
      
    if (error) throw error;
    
    if (data) {
      return {
        id: data.id,
        dueDate: data.due_date,
        percentage: data.percentage,
        description: data.description,
        status: data.status as PaymentStatus,
        paymentDate: data.payment_date,
        amount: data.amount
      };
    }
    
    return null;
  } catch (err) {
    console.error('Error updating payment schedule status:', err);
    throw err;
  }
};

// Function to get client invoices
export const getClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId);
      
    if (error) throw error;
    
    return data.map(mapInvoiceFromDatabase);
  } catch (err) {
    console.error('Error fetching client invoices:', err);
    return [];
  }
};

// Function to get client jobs
export const getClientJobs = async (clientId: string): Promise<Job[]> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('client_id', clientId);
      
    if (error) throw error;
    
    return data.map(job => ({
      id: job.id,
      clientId: job.client_id,
      companyId: job.company_id,
      title: job.title,
      description: job.description || '',
      status: job.status as 'active' | 'completed' | 'cancelled',
      date: job.date,
      location: job.location || '',
      startTime: job.start_time || '',
      endTime: job.end_time || '',
      isFullDay: job.is_full_day || false,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      calendarEventId: job.calendar_event_id,
      timezone: job.timezone || 'UTC'
    }));
  } catch (err) {
    console.error('Error fetching client jobs:', err);
    return [];
  }
};
