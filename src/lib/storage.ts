
import { Client, Invoice, STORAGE_KEYS } from "@/types";

// Generate a unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Generate a unique viewLink for invoices
export const generateViewLink = (): string => {
  return `${window.location.origin}/invoice/${generateId()}`;
};

// Client operations
export const getClients = (): Client[] => {
  const clients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
  return clients ? JSON.parse(clients) : [];
};

export const getClient = (id: string): Client | undefined => {
  const clients = getClients();
  return clients.find(client => client.id === id);
};

export const saveClient = (client: Omit<Client, 'id' | 'createdAt'>): Client => {
  const clients = getClients();
  const newClient: Client = {
    ...client,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([...clients, newClient]));
  return newClient;
};

export const updateClient = (client: Client): Client => {
  const clients = getClients();
  const updatedClients = clients.map(c => c.id === client.id ? client : c);
  
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedClients));
  return client;
};

export const deleteClient = (id: string): void => {
  const clients = getClients();
  const filteredClients = clients.filter(client => client.id !== id);
  
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(filteredClients));
  
  // Also delete all associated invoices
  const invoices = getInvoices();
  const filteredInvoices = invoices.filter(invoice => invoice.clientId !== id);
  
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(filteredInvoices));
};

// Invoice operations
export const getInvoices = (): Invoice[] => {
  const invoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
  return invoices ? JSON.parse(invoices) : [];
};

export const getInvoice = (id: string): Invoice | undefined => {
  const invoices = getInvoices();
  return invoices.find(invoice => invoice.id === id);
};

export const getInvoiceByViewLink = (viewLink: string): Invoice | undefined => {
  const invoices = getInvoices();
  return invoices.find(invoice => invoice.viewLink === viewLink);
};

export const getClientInvoices = (clientId: string): Invoice[] => {
  const invoices = getInvoices();
  return invoices.filter(invoice => invoice.clientId === clientId);
};

export const saveInvoice = (invoice: Omit<Invoice, 'id' | 'viewLink'>): Invoice => {
  const invoices = getInvoices();
  const newInvoice: Invoice = {
    ...invoice,
    id: generateId(),
    viewLink: generateViewLink(),
  };
  
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([...invoices, newInvoice]));
  return newInvoice;
};

export const updateInvoice = (invoice: Invoice): Invoice => {
  const invoices = getInvoices();
  const updatedInvoices = invoices.map(i => i.id === invoice.id ? invoice : i);
  
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updatedInvoices));
  return invoice;
};

export const updateInvoiceStatus = (id: string, status: Invoice['status']): Invoice | undefined => {
  const invoices = getInvoices();
  const invoice = invoices.find(i => i.id === id);
  
  if (!invoice) return undefined;
  
  const updatedInvoice = { ...invoice, status };
  const updatedInvoices = invoices.map(i => i.id === id ? updatedInvoice : i);
  
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updatedInvoices));
  return updatedInvoice;
};

export const deleteInvoice = (id: string): void => {
  const invoices = getInvoices();
  const filteredInvoices = invoices.filter(invoice => invoice.id !== id);
  
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(filteredInvoices));
};
