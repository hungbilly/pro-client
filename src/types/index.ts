
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
  country?: string;
  currency?: string;
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
  startTime?: string;
  endTime?: string;
  isFullDay?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  tax_rate?: number;
  user_id: string;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'accepted' | 'paid';
export type ContractStatus = 'pending' | 'accepted';
export type PaymentStatus = 'paid' | 'unpaid';

export interface PaymentSchedule {
  id: string;
  dueDate: string;
  percentage: number;
  description?: string;
  status: PaymentStatus;
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
  status: InvoiceStatus;
  contractStatus?: ContractStatus;
  items: InvoiceItem[];
  notes?: string;
  contractTerms?: string;
  viewLink: string;
  paymentSchedules?: PaymentSchedule[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  discount?: string;
  tax?: string;
}

// Local storage keys
export const STORAGE_KEYS = {
  CLIENTS: 'wedding-clients',
  INVOICES: 'wedding-invoices',
  JOBS: 'wedding-jobs'
};
