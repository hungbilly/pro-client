
import { Client, Invoice, STORAGE_KEYS, InvoiceItem } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Generate a unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Generate a unique viewLink for invoices
export const generateViewLink = (): string => {
  return `${window.location.origin}/invoice/${generateId()}`;
};

// Client operations
export const getClients = async (): Promise<Client[]> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*');
    
    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
    
    return data.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes || undefined,
      createdAt: client.created_at
    }));
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
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
      createdAt: data.created_at
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
        notes: client.notes
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
      createdAt: data.created_at
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
        notes: client.notes
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
      createdAt: data.created_at
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

// Invoice operations
export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    // First get all invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*');
    
    if (invoicesError || !invoicesData) {
      console.error('Error fetching invoices:', invoicesError);
      return [];
    }
    
    // Then get all invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*');
    
    if (itemsError || !itemsData) {
      console.error('Error fetching invoice items:', itemsError);
      return [];
    }
    
    // Map and transform the data
    return invoicesData.map(invoice => {
      const invoiceItems = itemsData
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
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        dueDate: invoice.due_date,
        shootingDate: invoice.shooting_date || undefined,
        status: invoice.status as 'draft' | 'sent' | 'accepted' | 'paid',
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
      number: invoice.number,
      amount: invoice.amount,
      date: invoice.date,
      dueDate: invoice.due_date,
      shootingDate: invoice.shooting_date || undefined,
      status: invoice.status as 'draft' | 'sent' | 'accepted' | 'paid',
      items: invoiceItems,
      notes: invoice.notes || undefined,
      contractTerms: invoice.contract_terms || undefined,
      viewLink: invoice.view_link
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return undefined;
  }
};

// Updated getInvoiceByViewLink to be more flexible
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
    
    return {
      id: matchingInvoice.id,
      clientId: matchingInvoice.client_id,
      number: matchingInvoice.number,
      amount: matchingInvoice.amount,
      date: matchingInvoice.date,
      dueDate: matchingInvoice.due_date,
      status: matchingInvoice.status as 'draft' | 'sent' | 'accepted' | 'paid',
      items: invoiceItems,
      notes: matchingInvoice.notes || undefined,
      contractTerms: matchingInvoice.contract_terms || undefined,
      viewLink: matchingInvoice.view_link
    };
  } catch (error) {
    console.error('Error in getInvoiceByViewLink:', error);
    return undefined;
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
      // No need to return empty array here as we still have invoices
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
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        dueDate: invoice.due_date,
        shootingDate: invoice.shooting_date || undefined,
        status: invoice.status as 'draft' | 'sent' | 'accepted' | 'paid',
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

export const saveInvoice = async (invoice: Omit<Invoice, 'id' | 'viewLink'>): Promise<Invoice> => {
  try {
    // Generate a view link
    const viewLink = generateViewLink();
    
    // Start a transaction by using the Supabase client
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        client_id: invoice.clientId,
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        due_date: invoice.dueDate,
        shooting_date: invoice.shootingDate,
        status: invoice.status,
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
      number: newInvoice.number,
      amount: newInvoice.amount,
      date: newInvoice.date,
      dueDate: newInvoice.due_date,
      shootingDate: newInvoice.shooting_date || undefined,
      status: newInvoice.status as 'draft' | 'sent' | 'accepted' | 'paid',
      items,
      notes: newInvoice.notes || undefined,
      contractTerms: newInvoice.contract_terms || undefined,
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
        number: invoice.number,
        amount: invoice.amount,
        date: invoice.date,
        due_date: invoice.dueDate,
        shooting_date: invoice.shootingDate,
        status: invoice.status,
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
