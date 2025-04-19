export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  companyId: string;
}

export interface Job {
  id: string;
  clientId: string;
  companyId: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  date: string;
  location: string;
  startTime: string;
  endTime: string;
  isFullDay: boolean;
  createdAt: string;
  updatedAt: string;
  calendarEventId?: string | null;
  timezone: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  name?: string;
  discount?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'accepted' | 'paid';
export type ContractStatus = 'pending' | 'accepted';
export type PaymentStatus = 'unpaid' | 'paid' | 'write-off';

export interface PaymentSchedule {
  id: string;
  dueDate: string;
  percentage: number;
  description?: string;
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
  contractAcceptedAt?: string;
  invoiceAcceptedAt?: string;
}

export interface CompanyClientView {
  id: string;
  company_id: string;
  name: string;
  logo_url: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description?: string;
  items: InvoiceItem[];
  contractTerms?: string;
  notes?: string;
  companyId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  company_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
