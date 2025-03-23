import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Invoice, InvoiceItem, Job, PaymentSchedule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, CalendarPlus, GripVertical, Pencil, Copy, Package as PackageIcon, AlertCircle, Briefcase, Mail, User } from 'lucide-react';
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
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  invoice: propInvoice, 
  clientId: propClientId, 
  jobId: propJobId, 
  invoiceId: propInvoiceId,
  contractTemplates = [],
  checkDuplicateInvoiceNumber
}) => {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  const { user } = useAuth();
  const params = useParams();
  
  const clientId = propClientId || params.clientId;
  const jobId = propJobId || params.jobId;
  const invoiceId = propInvoiceId || params.invoiceId;
  
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [invoice, setInvoice] = useState<Invoice | undefined>(propInvoice);
  const [number, setNumber] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [jobDate, setJobDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'paid'>('draft');
  const [contractStatus, setContractStatus] = useState<'pending' | 'accepted'>('pending');
  const [items, setItems] = useState<InvoiceItem[]>([{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [notes, setNotes] = useState('');
  const [contractTerms, setContractTerms] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingInvoiceNumber, setGeneratingInvoiceNumber] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>([
    { 
      id: Date.now().toString(), 
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      percentage: 100,
      description: 'Full payment',
      status: 'unpaid'
    }
  ]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedContractTemplateId, setSelectedContractTemplateId] = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(!!invoiceId);
  const [invoiceNumberError, setInvoiceNumberError] = useState<string | null>(null);
  const [checkingInvoiceNumber, setCheckingInvoiceNumber] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

  const generateInvoiceNumber = useCallback(async () => {
    if (isEditMode || generatingInvoiceNumber) return;
    
    setGeneratingInvoiceNumber(true);
    try {
      const today = new Date();
      const datePrefix = format(today, 'yyyyMMdd');
      
      const todayInvoices = await getInvoicesByDate(format(today, 'yyyy-MM-dd'));
      
      const sequenceNumbers: number[] = [];
      todayInvoices.forEach(inv => {
        if (inv.number && inv.number.startsWith(datePrefix)) {
          const parts = inv.number.split('-');
          if (parts.length === 2) {
            const seq = parseInt(parts[1], 10);
            if (!isNaN(seq)) {
              sequenceNumbers.push(seq);
            }
          }
        }
      });
      
      let nextSequence = 1;
      if (sequenceNumbers.length > 0) {
        nextSequence = Math.max(...sequenceNumbers) + 1;
      }
      
      const newInvoiceNumber = `${datePrefix}-${nextSequence}`;
      
      const duplicateExists = todayInvoices.some(inv => inv.number === newInvoiceNumber);
      if (duplicateExists) {
        toast.warning(`Invoice number ${newInvoiceNumber} already exists. This could indicate a system issue.`);
        nextSequence += 1;
        const altInvoiceNumber = `${datePrefix}-${nextSequence}`;
        setNumber(altInvoiceNumber);
      } else {
        setNumber(newInvoiceNumber);
      }
    } catch (error) {
      console.error('Error generating invoice number:', error);
      toast.error('Failed to generate invoice number automatically.');
    } finally {
      setGeneratingInvoiceNumber(false);
    }
  }, [isEditMode, generatingInvoiceNumber]);

  useEffect(() => {
    if (initialized) return;
    
    const fetchInvoiceData = async () => {
      if (invoiceId) {
        try {
          const fetchedInvoice = await getInvoice(invoiceId);
          if (fetchedInvoice) {
            setInvoice(fetchedInvoice);
            setNumber(fetchedInvoice.number || '');
            setDate(fetchedInvoice.date ? new Date(fetchedInvoice.date) : new Date());
            setJobDate(fetchedInvoice.shootingDate ? new Date(fetchedInvoice.shootingDate) : null);
            setStatus(fetchedInvoice.status as 'draft' | 'sent' | 'accepted' | 'paid');
            setContractStatus(fetchedInvoice.contractStatus as 'pending' | 'accepted');
            setItems(fetchedInvoice.items || []);
            setNotes(fetchedInvoice.notes || '');
            setContractTerms(fetchedInvoice.contractTerms || '');
            
            if (fetchedInvoice.paymentSchedules && fetchedInvoice.paymentSchedules.length > 0) {
              setPaymentSchedules(fetchedInvoice.paymentSchedules);
            }
          } else {
            toast.error('Invoice not found.');
          }
        } catch (error) {
          console.error('Error fetching invoice:', error);
          toast.error('Failed to load invoice data.');
        }
      } else {
        await generateInvoiceNumber();
      }
    };

    const fetchClientData = async () => {
      if (clientId) {
        try {
          const fetchedClient = await getClient(clientId);
          if (fetchedClient) {
            setClient(fetchedClient);
          } else {
            toast.error('Client not found.');
          }
        } catch (error) {
          console.error('Error fetching client:', error);
          toast.error('Failed to load client data.');
        }
      } else if (invoice?.clientId) {
        try {
          const fetchedClient = await getClient(invoice.clientId);
          if (fetchedClient) {
            setClient(fetchedClient);
          }
        } catch (error) {
          console.error('Error fetching client from invoice:', error);
        }
      }
    };

    const fetchJobData = async () => {
      if (jobId) {
        try {
          const fetchedJob = await getJob(jobId);
          if (fetchedJob) {
            setJob(fetchedJob);
            if (fetchedJob.date) {
              setJobDate(new Date(fetchedJob.date));
            }
            if (!client && fetchedJob.clientId) {
              const jobClient = await getClient(fetchedJob.clientId);
              if (jobClient) setClient(jobClient);
            }
          } else {
            toast.error('Job not found.');
          }
        } catch (error) {
          console.error('Error fetching job:', error);
          toast.error('Failed to load job data.');
        }
      } else if (invoice?.jobId) {
        try {
          const fetchedJob = await getJob(invoice.jobId);
          if (fetchedJob) {
            setJob(fetchedJob);
            if (fetchedJob.date && !jobDate) {
              setJobDate(new Date(fetchedJob.date));
            }
          }
        } catch (error) {
          console.error('Error fetching job from invoice:', error);
        }
      }
    };

    const fetchTemplates = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('invoice_templates')
          .select('id, name, content')
          .eq('user_id', user.id);
          
        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    
    const loadAllData = async () => {
      setLoading(true);
      await fetchInvoiceData();
      await fetchClientData();
      await fetchJobData();
      if (user) await fetchTemplates();
      setLoading(false);
      setInitialized(true);
    };
    
    loadAllData();
  }, [clientId, jobId, invoiceId, user, invoice?.clientId, invoice?.jobId, initialized, generateInvoiceNumber]);

  const calculateTotalAmount = () => {
    return items.reduce((total, item) => total + item.amount, 0);
  };

  const handleAddItem = () => {
    const newItemId = Date.now().toString();
    const newItem = { id: newItemId, description: '', quantity: 1, rate: 0, amount: 0 };
    setEditingItem(newItem);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: InvoiceItem) => {
    setEditingItem({...item});
    setIsItemDialogOpen(true);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    if (activeRowId === id) {
      setActiveRowId(null);
    }
  };

  const handleSaveItem = () => {
    if (!editingItem) return;
    
    const updatedItems = editingItem.id ? 
      items.map(item => item.id === editingItem.id ? editingItem : item) :
      [...items, { ...editingItem, id: Date.now().toString() }];
    
    setItems(updatedItems);
    setIsItemDialogOpen(false);
    setEditingItem(null);
  };

  const handleItemChange = (field: string, value: any) => {
    if (!editingItem) return;
    
    const updatedItem = { ...editingItem, [field]: value };
    
    if (field === 'quantity' || field === 'rate') {
      const quantity = field === 'quantity' ? value : editingItem.quantity;
      const rate = field === 'rate' ? value : editingItem.rate;
      updatedItem.amount = quantity * rate;
    }
    
    setEditingItem(updatedItem);
  };
  
  const handleDuplicateItem = (id: string) => {
    const itemToDuplicate = items.find(item => item.id === id);
    if (itemToDuplicate) {
      const newItem = {
        ...itemToDuplicate,
        id: Date.now().toString()
      };
      setItems([...items, newItem]);
    }
  };
  
  const handlePackageSelect = (newItems: InvoiceItem[]) => {
    console.log('handlePackageSelect called with items:', newItems);
    
    if (!newItems || newItems.length === 0) {
      console.warn('No items provided to handlePackageSelect');
      return;
    }
    
    const updatedItems = [...items, ...newItems];
    console.log('Updated items after package selection:', updatedItems);
    setItems(updatedItems);
    setActiveRowId(null);
    
    setTimeout(() => {
      console.log('Current items state after update:', items);
    }, 100);
  };
  
  const handleManualPackageEntry = (id: string) => {
    console.log('handleManualPackageEntry called for id:', id);
    setActiveRowId(id);
  };

  const handleDoneEditing = () => {
    console.log('handleDoneEditing called, current activeRowId:', activeRowId);
    setActiveRowId(null);
  };

  const handleAddToGoogleCalendar = () => {
    if (!jobDate || !client) return;
    
    const formattedDate = format(jobDate, 'yyyyMMdd');
    const title = `Photo Shoot - ${client.name} - Invoice #${number}`;
    const details = `Photo shooting session for ${client.name}.\n\nClient Contact:\nEmail: ${client.email}\nPhone: ${client.phone}\n\nAddress: ${client.address}\n\nInvoice #${number}`;
    
    const dateStart = formattedDate;
    const dateEnd = formattedDate;
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dateStart}/${dateEnd}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(client.address)}`;
    
    window.open(googleCalendarUrl, '_blank');
    toast.success('Opening Google Calendar...');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      
      if (template.content) {
        setNotes(template.content);
      }
      
      toast.success(`Template "${template.name}" applied`);
    }
  };

  const handleContractTemplateSelect = (templateId: string) => {
    const template = contractTemplates.find(t => t.id === templateId);
    if (template && template.content) {
      setSelectedContractTemplateId(templateId);
      setContractTerms(template.content);
      toast.success(`Contract template "${template.name}" applied`);
    }
  };

  const handleAddPaymentSchedule = () => {
    const currentTotal = paymentSchedules.reduce((sum, schedule) => sum + schedule.percentage, 0);
    const remainingPercentage = Math.max(0, 100 - currentTotal);
    
    if (remainingPercentage <= 0) {
      toast.warning("Payment schedules already total 100%. Adjust existing schedules first.");
      return;
    }
    
    let newDueDate = new Date();
    if (paymentSchedules.length > 0) {
      const latestDueDate = Math.max(
        ...paymentSchedules.map(s => new Date(s.dueDate).getTime())
      );
      newDueDate = new Date(latestDueDate);
      newDueDate.setDate(newDueDate.getDate() + 30);
    }
    
    setPaymentSchedules([
      ...paymentSchedules,
      {
        id: Date.now().toString(),
        dueDate: format(newDueDate, 'yyyy-MM-dd'),
        percentage: remainingPercentage,
        description: `Payment ${paymentSchedules.length + 1}`,
        status: 'unpaid'
      }
    ]);
  };
  
  const handleRemovePaymentSchedule = (id: string) => {
    if (paymentSchedules.length <= 1) {
      toast.warning("At least one payment schedule is required.");
      return;
    }
    
    const filteredSchedules = paymentSchedules.filter(schedule => schedule.id !== id);
    
    const newTotal = filteredSchedules.reduce((sum, schedule) => sum + schedule.percentage, 0);
    if (newTotal < 100) {
      const firstSchedule = filteredSchedules[0];
      firstSchedule.percentage += (100 - newTotal);
    }
    
    setPaymentSchedules(filteredSchedules);
  };
  
  const handleScheduleChange = (id: string, field: 'percentage' | 'description' | 'dueDate' | 'status', value: any) => {
    setPaymentSchedules(schedules => {
      const updatedSchedules = schedules.map(schedule => {
        if (schedule.id === id) {
          if (field === 'percentage') {
            const newPercentage = Math.min(100, Math.max(0, parseInt(value) || 0));
            return { ...schedule, [field]: newPercentage };
          }
          return { ...schedule, [field]: value };
        }
        return schedule;
      });
      
      validateSchedulePercentages(updatedSchedules);
      
      return updatedSchedules;
    });
  };
  
  const validateSchedulePercentages = (schedules: PaymentSchedule[]) => {
    const total = schedules.reduce((sum, schedule) => sum + schedule.percentage, 0);
    if (total !== 100) {
      console.warn(`Payment schedules total ${total}% instead of 100%`);
      return false;
    }
    return true;
  };
  
  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  const validateInvoiceNumber = useCallback(
    async (number: string) => {
      if (!number.trim()) {
        setInvoiceNumberError("Invoice number is required");
        return false;
      }
      
      if (checkDuplicateInvoiceNumber) {
        setCheckingInvoiceNumber(true);
        try {
          const isDuplicate = await checkDuplicateInvoiceNumber(number, invoiceId);
          if (isDuplicate) {
            setInvoiceNumberError(`Invoice number "${number}" already exists. Please use a different number.`);
            return false;
          } else {
            setInvoiceNumberError(null);
            return true;
          }
        } catch (error) {
          console.error("Error checking invoice number:", error);
          return false;
        } finally {
          setCheckingInvoiceNumber(false);
        }
      }
      
      return true;
    },
    [checkDuplicateInvoiceNumber, invoiceId]
  );

  const handleNumberChange = async (value: string) => {
    setNumber(value);
    // Debounce validation to avoid too many requests
    if (value !== invoice?.number) {
      setTimeout(() => validateInvoiceNumber(value), 500);
    } else {
      setInvoiceNumberError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Invoice form submission started');

    if (!client) {
      console.error('Form validation failed: Client is required');
      toast.error('Client is required.');
      return;
    }

    if (!date) {
      console.error('Form validation failed: Date is required');
      toast.error('Date is required.');
      return;
    }

    if (!selectedCompanyId) {
      console.error('Form validation failed: Company not selected');
      toast.error('Please select a company first.');
      return;
    }

    if (!number.trim()) {
      console.error('Form validation failed: Invoice number is required');
      toast.error('Invoice number is required.');
      return;
    }
    
    if (checkDuplicateInvoiceNumber) {
      const isDuplicate = await checkDuplicateInvoiceNumber(number, invoiceId);
      if (isDuplicate) {
        console.error('Form validation failed: Duplicate invoice number');
        toast.error(`Invoice number "${number}" already exists. Please use a different number.`);
        return;
      }
    }
    
    console.log('Validating payment schedules:', paymentSchedules);
    if (!validateSchedulePercentages(paymentSchedules)) {
      console.error('Form validation failed: Payment schedules must add up to exactly 100%');
      toast.error('Payment schedules must add up to exactly 100%.');
      return;
    }

    const firstPaymentDueDate = paymentSchedules.length > 0 ? paymentSchedules[0].dueDate : format(new Date(), 'yyyy-MM-dd');

    const amount = calculateTotalAmount();
    console.log('Calculated total amount:', amount);

    try {
      console.log('Starting invoice save/update process. isEditMode:', isEditMode);
      
      if (isEditMode && invoice) {
        console.log('Updating existing invoice:', invoice.id);
        
        if (number !== invoice.number) {
          console.log('Invoice number changed, checking for duplicates');
          const allInvoices = await getInvoicesByDate();
          const duplicateExists = allInvoices.some(inv => inv.number === number && inv.id !== invoice.id);
          
          if (duplicateExists) {
            console.error('Duplicate invoice number detected:', number);
            toast.error(`Invoice number ${number} already exists. Please use a different number.`);
            return;
          }
        }

        const updatedInvoice: Invoice = {
          id: invoice.id,
          clientId: client.id,
          companyId: selectedCompanyId,
          jobId: job?.id || invoice.jobId,
          number,
          amount,
          date: format(date, 'yyyy-MM-dd'),
          dueDate: firstPaymentDueDate,
          status,
          contractStatus,
          items,
          notes,
          contractTerms,
          viewLink: invoice.viewLink,
          paymentSchedules: paymentSchedules,
        };

        if (jobDate) {
          updatedInvoice.shootingDate = format(jobDate, 'yyyy-MM-dd');
        }

        console.log('Calling updateInvoice with data:', JSON.stringify(updatedInvoice));
        const result = await updateInvoice(updatedInvoice);
        console.log('Invoice updated successfully:', result);
        toast.success('Invoice updated successfully!');
        
        navigate(`/invoice/${invoice.id}`);
      } else {
        console.log('Creating new invoice');
        console.log('Checking for duplicate invoice numbers');
        const allInvoices = await getInvoicesByDate();
        const duplicateExists = allInvoices.some(inv => inv.number === number);
        
        if (duplicateExists) {
          console.error('Duplicate invoice number detected:', number);
          toast.error(`Invoice number ${number} already exists. Please use a different number.`);
          return;
        }

        const invoiceData: Omit<Invoice, 'id' | 'viewLink'> = {
          clientId: client.id,
          companyId: selectedCompanyId,
          jobId: job?.id,
          number,
          amount,
          date: format(date, 'yyyy-MM-dd'),
          dueDate: firstPaymentDueDate,
          status,
          contractStatus,
          items,
          notes,
          contractTerms,
          paymentSchedules: paymentSchedules,
        };

        if (jobDate) {
          invoiceData.shootingDate = format(jobDate, 'yyyy-MM-dd');
        }

        console.log('Calling saveInvoice with data:', JSON.stringify(invoiceData));
        const newInvoice = await saveInvoice(invoiceData);
        console.log('New invoice created successfully:', newInvoice);
        toast.success('Invoice saved successfully!');
        
        if (newInvoice && newInvoice.id) {
          console.log('Navigating to new invoice page:', newInvoice.id);
          navigate(`/invoice/${newInvoice.id}`);
        } else if (job?.id) {
          console.log('Navigating to job page:', job.id);
          navigate(`/job/${job.id}`);
        } else if (client) {
          console.log('Navigating to client page:', client.id);
          navigate(`/client/${client.id}`);
        } else {
          console.log('Navigating to home page');
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Failed to save/update invoice:', error);
      toast.error('Failed to save/update invoice.');
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-5xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center p-8">Loading data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!client) {
    return (
      <Card className="w-full max-w-5xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center p-8">Client data not available. Please go back and try again.</div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Invoice' : 'Create Invoice'}</CardTitle>
        <CardDescription>
          {job ? `${isEditMode ? 'Editing' : 'Creating'} invoice for job: ${job.title}` : 'Fill in the details to create the invoice.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3 bg-muted/50">
                <CardTitle className="text-lg">Job</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {job ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h3 className="text-base font-medium">{job.title}</h3>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-medium mt-4">Job Date</h3>
                      <div className="flex items-start gap-3 mt-3">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-sm text-muted-foreground">Date & Time</div>
                          <div className="mt-1">
                            {jobDate ? format(jobDate, "d MMMM yyyy") : "No date specified"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No job selected</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 bg-muted/50">
                <CardTitle className="text-lg">Client</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-base font-medium">{client.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="mt-1">{client.email}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="number">Invoice Number</Label>
                <Input
                  type="text"
                  id="number"
                  value={number}
                  onChange={(e) => handleNumberChange(e.target.value)}
                  required
                  placeholder="Auto-generated (YYYYMMDD-X)"
                  disabled={generatingInvoiceNumber || checkingInvoiceNumber}
                  className={invoiceNumberError ? "border-red-500" : ""}
                />
                {invoiceNumberError && (
                  <div className="flex items-center mt-1 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {invoiceNumberError}
                  </div>
                )}
                {!invoiceNumberError && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEditMode ? 
                      "You can change the invoice number, but it must be unique." : 
                      "Automatically generated with format YYYYMMDD-X. X is the sequence number for today."}
                  </p>
                )}
              </div>
              
              <div>
                <Label>Invoice Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePicker
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Invoice Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as 'draft' | 'sent' | 'accepted' | 'paid')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="contractStatus">Contract Status</Label>
                <Select value={contractStatus} onValueChange={(value) => setContractStatus(value as 'pending' | 'accepted')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {templates.length > 0 && (
            <div>
              <Label htmlFor="template">Invoice Template</Label>
              <Select 
                value={selectedTemplateId || ''} 
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Select a template to quickly fill in invoice details
              </p>
            </div>
          )}
          
          {contractTemplates.length > 0 && (
            <div>
              <Label htmlFor="contractTemplate">Contract Template</Label>
              <Select 
                value={selectedContractTemplateId || ''} 
                onValueChange={handleContractTemplateSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a contract template" />
                </SelectTrigger>
                <SelectContent>
                  {contractTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Select a template to quickly fill in contract terms
              </p>
            </div>
          )}
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Line Items</h3>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline">
                      <PackageIcon className="h-4 w-4 mr-2" />
                      Add Existing Package
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <PackageSelector onPackageSelect={handlePackageSelect} variant="direct-list" />
                  </PopoverContent>
                </Popover>
                <Button type="button" onClick={handleAddItem} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead className="w-28 text-right hidden md:table-cell">Unit Price</TableHead>
                    <TableHead className="w-24 text-right hidden md:table-cell">Quantity</TableHead>
                    <TableHead className="w-32 text-right hidden md:table-cell">Amount</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-1">
                          {item.description ? (
                            <div 
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: item.description }}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No description provided
                            </span>
                          )}
                          
                          <div className="md:hidden space-y-1 mt-2">
                            <div className="text-sm flex justify-between">
                              <span className="text-muted-foreground">Unit Price:</span>
                              <span>{formatCurrency(item.rate)}</span>
                            </div>
                            <div className="text-sm flex justify-between">
                              <span className="text-muted-foreground">Quantity:</span>
                              <span>{item.quantity}</span>
                            </div>
                            <div className="text-sm flex justify-between font-medium">
                              <span className="text-muted-foreground">Amount:</span>
                              <span>{formatCurrency(item.amount)}</span>
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditItem(item);
                            }}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit details
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {formatCurrency(item.rate)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium hidden md:table-cell">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicateItem(item.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No items added yet. Click "Add Line Item" to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between py-2 border-t">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-medium">{formatCurrency(calculateTotalAmount())}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount</span>
                  <span>None</span>
                </div>
                <div className="flex justify-between py-2 border-t border-b">
                  <span className="font-medium">Total Due</span>
                  <span className="font-bold">{formatCurrency(calculateTotalAmount())}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="notes">Invoice Notes</Label>
                {templates.length > 0 && (
                  <div className="mb-2">
                    <Label htmlFor="template">Invoice Template</Label>
                    <Select 
                      value={selectedTemplateId || ''} 
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <RichTextEditor
                  value={notes}
                  onChange={(value) => setNotes(value)}
                  placeholder="Enter invoice notes..."
                />
              </div>
              
              {contractTemplates.length > 0 && (
                <div>
                  <Label htmlFor="contractTemplate">Contract Template</Label>
                  <Select 
                    value={selectedContractTemplateId || ''} 
                    onValueChange={handleContractTemplateSelect}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a contract template" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a template to quickly fill in contract terms
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <Label htmlFor="contractTerms">Contract Terms</Label>
              <RichTextEditor
                value={contractTerms}
                onChange={(value) => setContractTerms(value)}
                placeholder="Enter contract terms..."
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Payment Schedule</h3>
            <Button type="button" onClick={handleAddPaymentSchedule} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Description</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSchedules.map((schedule) => {
                  const scheduleAmount = calculateTotalAmount() * (schedule.percentage / 100);
                  
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <Input
                          type="text"
                          value={schedule.description}
                          onChange={(e) => handleScheduleChange(schedule.id, 'description', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(new Date(schedule.dueDate), "PPP")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePicker
                              mode="single"
                              selected={new Date(schedule.dueDate)}
                              onSelect={(date) => date && handleScheduleChange(schedule.id, 'dueDate', format(date, 'yyyy-MM-dd'))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            value={schedule.percentage}
                            onChange={(e) => handleScheduleChange(schedule.id, 'percentage', e.target.value)}
                            className="max-w-16 text-right"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(scheduleAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleRemovePaymentSchedule(schedule.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paymentSchedules.reduce((total, schedule) => total + schedule.percentage, 0) !== 100 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-amber-600">
                      Warning: Payment schedules must add up to 100%. Current total: {paymentSchedules.reduce((total, schedule) => total + schedule.percentage, 0)}%
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            if (job?.id) {
              navigate(`/job/${job.id}`);
            } else if (client) {
              navigate(`/client/${client.id}`);
            } else {
              navigate('/');
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!!invoiceNumberError || checkingInvoiceNumber}
        >
          {isEditMode ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </CardFooter>

      <Dialog 
        open={isItemDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsItemDialogOpen(false);
            setEditingItem(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  value={editingItem.description}
                  onChange={(value) => handleItemChange('description', value)}
                  className="min-h-[150px]"
                  placeholder="Enter item description..."
                  alwaysShowToolbar={true}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate">Unit Price</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={editingItem.rate}
                    onChange={(e) => handleItemChange('rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => handleItemChange('quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                <div>
                  <span className="font-medium">Total: </span>
                  <span>{formatCurrency(editingItem.amount)}</span>
                </div>
                <div className="space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsItemDialogOpen(false);
                      setEditingItem(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSaveItem();
                    }}
                  >
                    Save Item
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InvoiceForm;
