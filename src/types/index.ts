export interface User {
  id: string;
  email: string;
  name?: string;
  companyId?: string;
  role?: string;
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  ownerId: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  companyId: string;
}

export interface Job {
  id: string;
  title: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  clientId: string;
  companyId: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface PaymentSchedule {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'write-off';
  invoiceId: string;
  paymentDate?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  clientId: string;
  jobId?: string;
  companyId: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'paid';
  dueDate: string;
  notes?: string;
  items: InvoiceItem[];
  paymentSchedules?: PaymentSchedule[];
  viewLink: string;
  pdfUrl?: string;
  contractTerms?: string;
  contractStatus?: 'pending' | 'accepted';
  contractSignature?: ContractSignature;
}

export interface CompanyClientView {
  id: string;
  company_id: string;
  name: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
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

export interface ContractSignature {
  signerName: string;
  signedAt: string;
}
