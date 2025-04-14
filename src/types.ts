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

// Update the Job type to include calendarEventId
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
  calendarEventId?: string; // Add this field for calendar integration
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId: string;
  number: number;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}
