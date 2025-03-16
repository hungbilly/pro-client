
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  notes?: string;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  is_default: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  clientId: string;
  companyId?: string;
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
  companyId?: string;
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
