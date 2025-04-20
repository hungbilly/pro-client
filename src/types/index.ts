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
  timezone: string;
  is_default: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyClientView {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
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
  createdAt?: string;
  updatedAt?: string;
  calendarEventId?: string | null;
  timezone?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description?: string;
  items: InvoiceItem[];
  contractTerms?: string;
  notes?: string;
  companyId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // Database fields (direct from Supabase)
  company_id?: string;
  user_id: string;
  content?: string;
  created_at: string;
  updated_at: string;
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
export type PaymentStatus = 'paid' | 'unpaid' | 'write-off';

export interface PaymentSchedule {
  id: string;
  description: string;
  dueDate: string;
  percentage: number;
  status: PaymentStatus;
  paymentDate?: string;
  amount?: number; // Add the amount property as optional
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
  status: InvoiceStatus;
  contractStatus?: ContractStatus;
  items: InvoiceItem[];
  notes?: string;
  contractTerms?: string;
  viewLink: string;
  paymentSchedules?: PaymentSchedule[];
  shootingDate?: string;
  pdfUrl?: string;
  templateId?: string; // Added to track which template was used
}

export interface InvoiceItem {
  id: string;
  name?: string;      // Added name field
  productName?: string; // Keep for backward compatibility
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  discount?: string;
  tax?: string;
}

export interface DiscountTemplate {
  id: string;
  name: string;
  description?: string;
  amount: number;
  type: 'fixed' | 'percentage';
  companyId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // Database fields (direct from Supabase)
  company_id?: string;
  user_id: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

export const STORAGE_KEYS = {
  CLIENTS: 'wedding-clients',
  INVOICES: 'wedding-invoices',
  JOBS: 'wedding-jobs'
};
