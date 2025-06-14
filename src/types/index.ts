
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
  payment_methods?: string;
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
  currency?: string;
  payment_methods?: string;
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
  discounts?: DiscountItem[];
  paymentSchedules?: PaymentSchedule[];
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

export type ContractStatus = 'pending' | 'accepted';
export type InvoiceStatus = 'draft' | 'sent' | 'accepted' | 'paid';

export type PaymentStatus = 'paid' | 'unpaid' | 'write-off';

export interface PaymentSchedule {
  id: string;
  description: string;
  dueDate: string;
  percentage: number;
  status: PaymentStatus;
  paymentDate?: string;
  amount?: number;
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
  contractStatus: ContractStatus;
  items: InvoiceItem[];
  notes?: string;
  contractTerms?: string;
  viewLink: string;
  paymentSchedules?: PaymentSchedule[];
  shootingDate?: string;
  pdfUrl?: string;
  templateId?: string;
  contract_accepted_at?: string;
  invoice_accepted_by?: string;
}

export interface InvoiceItem {
  id: string;
  name?: string;
  productName?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  discount?: string;
  tax?: string;
}

export interface DiscountItem {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
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

export interface Expense {
  id: string;
  companyId: string;
  amount: number;
  description: string;
  category: string; // This represents the category_id from the database
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const STORAGE_KEYS = {
  CLIENTS: 'wedding-clients',
  INVOICES: 'wedding-invoices',
  JOBS: 'wedding-jobs'
};
