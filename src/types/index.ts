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

export type JobStatus = 'active' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  clientId: string;
  companyId: string;
  title: string;
  description: string;
  status: JobStatus;
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

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'void';
export type ContractStatus = 'pending' | 'accepted' | 'rejected';
export type PaymentStatus = 'unpaid' | 'paid' | 'partial';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  name: string;
}

export interface PaymentSchedule {
  id: string;
  dueDate: string;
  percentage: number;
  description: string;
  status: PaymentStatus;
  paymentDate?: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  companyId: string;
  jobId: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  contractStatus: ContractStatus;
  notes: string;
  contractTerms: string;
  viewLink: string;
  shootingDate: string;
  items: InvoiceItem[];
  paymentSchedules: PaymentSchedule[];
  pdfUrl?: string;
  contract_accepted_at?: string;
  invoice_accepted_by?: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  companyId: string;
}
