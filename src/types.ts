
export interface User {
  id: string;
  email: string;
  name?: string;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Job {
  id: string;
  clientId: string;
  companyId: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  date?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  isFullDay?: boolean;
  createdAt: string;
  updatedAt?: string;
  calendarEventId?: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId: string;
  jobId?: string;
  number: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  totalAmount: number;
  amount: number;
  notes?: string;
  contractTerms?: string;
  contractStatus?: ContractStatus;
  date: string;
  viewLink: string;
  paymentSchedules?: PaymentSchedule[];
  shootingDate?: string;
  pdfUrl?: string;
  items: InvoiceItem[];
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

export type InvoiceStatus = 'draft' | 'sent' | 'accepted' | 'paid' | 'overdue';
export type ContractStatus = 'pending' | 'accepted';
export type PaymentStatus = 'paid' | 'unpaid' | 'write-off';

export interface PaymentSchedule {
  id: string;
  description: string;
  dueDate: string;
  percentage: number;
  status: PaymentStatus;
  paymentDate?: string;
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
