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
  calendarEventId: string | null;
  timezone: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
}

export interface PaymentSchedule {
  id: string;
  dueDate: string;
  percentage: number;
  description: string;
  status: PaymentStatus;
  paymentDate?: string;
  amount: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type ContractStatus = 'pending' | 'accepted' | 'rejected';

export interface Invoice {
  id: string;
  clientId: string;
  companyId: string;
  jobId: string;
  number: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  contractStatus: ContractStatus;
  items: InvoiceItem[];
  notes: string;
  contractTerms: string;
  viewLink: string;
  paymentSchedules: PaymentSchedule[];
  pdfUrl: string;
  shootingDate: string;
  templateId: string;
  contractAcceptedAt?: string;
  invoiceAcceptedAt?: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  items: InvoiceItem[];
}

export interface CompanyClientView {
  id: string;
  company_id: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

// Add Company type
export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  country?: string;
  currency?: string;
  theme?: string;
  timezone: string;
  is_default?: boolean;
  user_id?: string;
  createdAt: string;
  updatedAt?: string;
}

// Define InvoiceTemplate type if missing
export interface InvoiceTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  companyId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items?: any[]; // Replace with proper type definition if available
}
