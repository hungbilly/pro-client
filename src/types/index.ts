
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  notes?: string;
}

export interface Job {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  date?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  jobId?: string;
  number: string;
  amount: number;
  date: string;
  dueDate: string;
  shootingDate?: string;
  status: 'draft' | 'sent' | 'accepted' | 'paid';
  contractStatus?: 'pending' | 'accepted';
  items: InvoiceItem[];
  notes?: string;
  contractTerms?: string;
  viewLink: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Local storage keys
export const STORAGE_KEYS = {
  CLIENTS: 'wedding-clients',
  INVOICES: 'wedding-invoices',
  JOBS: 'wedding-jobs'
};
