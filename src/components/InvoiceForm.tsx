import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Invoice, InvoiceItem, Job, PaymentSchedule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, CalendarPlus, Pencil, Copy, Package as PackageIcon, AlertCircle, Briefcase, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { getClient, saveInvoice, updateInvoice, getJob, getInvoice, getInvoicesByDate } from '@/lib/storage';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { useCompany } from './CompanySelector';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PackageSelector from './PackageSelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import RichTextEditor from './RichTextEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ContractTemplate {
  id: string;
  name: string;
  content?: string;
  description?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  clientId?: string;
  jobId?: string;
  invoiceId?: string;
  contractTemplates?: ContractTemplate[];
  checkDuplicateInvoiceNumber?: (number: string, currentInvoiceId?: string) => Promise<boolean>;
  onInvoiceDeleted?: (invoiceId: string) => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  invoice: propInvoice, 
  clientId: propClientId, 
  jobId: propJobId, 
  invoiceId: propInvoiceId,
  contractTemplates = [],
  checkDuplicateInvoiceNumber,
  onInvoiceDeleted
}) => {
  // ... keep existing code (the rest of the InvoiceForm component implementation)
};
