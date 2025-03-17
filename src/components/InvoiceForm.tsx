
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Invoice, InvoiceItem, Job, PaymentSchedule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, Camera, CalendarPlus, GripVertical, Pencil, Copy, Package as PackageIcon } from 'lucide-react';
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

interface InvoiceFormProps {
  invoice?: Invoice;
  clientId?: string;
  jobId?: string;
  invoiceId?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice: propInvoice, clientId: propClientId, jobId: propJobId, invoiceId: propInvoiceId }) => {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  const params = useParams();
  
  const clientId = propClientId || params.clientId;
  const jobId = propJobId || params.jobId;
  const invoiceId = propInvoiceId || params.invoiceId;
  
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [invoice, setInvoice] = useState<Invoice | undefined>(propInvoice);
  const [number, setNumber] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [shootingDate, setShootingDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'paid'>('draft');
  const [contractStatus, setContractStatus] = useState<'pending' | 'accepted'>('pending');
  const [items, setItems] = useState<InvoiceItem[]>([{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [notes, setNotes] = useState('');
  const [contractTerms, setContractTerms] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingInvoiceNumber, setGeneratingInvoiceNumber] = useState(false);
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>([
    { id: Date.now().toString(), dueDate: format(new Date(), 'yyyy-MM-dd'), percentage: 100, status: 'unpaid' }
  ]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { user } = useAuth();

  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(!!invoiceId);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (invoiceId) {
        try {
          const fetchedInvoice = await getInvoice(invoiceId);
          if (fetchedInvoice) {
            setInvoice(fetchedInvoice);
            setNumber(fetchedInvoice.number || '');
            setDate(fetchedInvoice.date ? new Date(fetchedInvoice.date) : new Date());
            setDueDate(fetchedInvoice.dueDate ? new Date(fetchedInvoice.dueDate) : new Date());
            setShootingDate(fetchedInvoice.shootingDate ? new Date(fetchedInvoice.shootingDate) : null);
            setStatus(fetchedInvoice.status as 'draft' | 'sent' | 'accepted' | 'paid');
            setContractStatus(fetchedInvoice.contractStatus as 'pending' | 'accepted');
            setItems(fetchedInvoice.items || []);
            setNotes(fetchedInvoice.notes || '');
            setContractTerms(fetchedInvoice.contractTerms || '');
            
            // Set payment schedules if available, otherwise use default
            if (fetchedInvoice.paymentSchedules && fetchedInvoice.paymentSchedules.length > 0) {
              setPaymentSchedules(fetchedInvoice.paymentSchedules);
            } else {
              setPaymentSchedules([
                { 
                  id: Date.now().toString(), 
                  dueDate: fetchedInvoice.dueDate, 
                  percentage: 100, 
                  status: 'unpaid' 
                }
              ]);
            }
          } else {
            toast.error('Invoice not found.');
          }
        } catch (error) {
          console.error('Error fetching invoice:', error);
          toast.error('Failed to load invoice data.');
        }
      } else {
        generateInvoiceNumber();
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
    };
    
    loadAllData();
  }, [clientId, jobId, invoiceId, user, invoice?.clientId, invoice?.jobId, client]);

  const generateInvoiceNumber = async () => {
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
  };

  const calculateTotalAmount = () => {
    return items.reduce((total, item) => total + item.amount, 0);
  };

  const handleAddItem = () => {
    const newItemId = Date.now().toString();
    setItems([...items, { id: newItemId, description: '', quantity: 1, rate: 0, amount: 0 }]);
    setActiveRowId(newItemId);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    if (activeRowId === id) {
      setActiveRowId(null);
    }
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'quantity' || field === 'rate') {
          const quantity = field === 'quantity' ? value : item.quantity;
          const rate = field === 'rate' ? value : item.rate;
          updatedItem.amount = quantity * rate;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };
  
  // New functions for payment schedules
  const handleAddPaymentSchedule = () => {
    // Split the current percentages equally
    const newCount = paymentSchedules.length + 1;
    const equalPercentage = Math.floor(100 / newCount);
    
    // Distribute percentages
    const updatedSchedules = paymentSchedules.map(schedule => ({
      ...schedule,
      percentage: equalPercentage
    }));
    
    // Add remaining percentage to the first schedule to ensure total is 100%
    const remainingPercentage = 100 - (equalPercentage * newCount);
    if (updatedSchedules.length > 0 && remainingPercentage !== 0) {
      updatedSchedules[0].percentage += remainingPercentage;
    }
    
    // Add new payment schedule
    const newSchedule: PaymentSchedule = {
      id: Date.now().toString(),
      dueDate: format(dueDate || new Date(), 'yyyy-MM-dd'),
      percentage: equalPercentage,
      status: 'unpaid'
    };
    
    setPaymentSchedules([...updatedSchedules, newSchedule]);
  };
  
  const handleRemovePaymentSchedule = (id: string) => {
    // Don't remove if it's the last schedule
    if (paymentSchedules.length <= 1) {
      toast.warning("You must have at least one payment schedule");
      return;
    }
    
    // Remove the schedule
    const filteredSchedules = paymentSchedules.filter(s => s.id !== id);
    
    // Redistribute percentages
    const totalRemainingPercentage = filteredSchedules.reduce((sum, s) => sum + s.percentage, 0);
    if (totalRemainingPercentage !== 100) {
      // Normalize to ensure total is 100%
      const multiplier = 100 / totalRemainingPercentage;
      const updatedSchedules = filteredSchedules.map((s, index) => {
        if (index === filteredSchedules.length - 1) {
          // Last item gets the remaining to ensure exactly 100%
          const sumOfPrevious = filteredSchedules.slice(0, -1).reduce(
            (sum, s) => sum + Math.round(s.percentage * multiplier), 0
          );
          return { ...s, percentage: 100 - sumOfPrevious };
        }
        return { ...s, percentage: Math.round(s.percentage * multiplier) };
      });
      
      setPaymentSchedules(updatedSchedules);
    } else {
      setPaymentSchedules(filteredSchedules);
    }
  };
  
  const handlePaymentScheduleChange = (id: string, field: string, value: any) => {
    // Handle payment schedule changes, particularly percentage changes
    if (field === 'percentage') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        return; // Invalid percentage
      }
      
      // Find the schedule we're updating
      const scheduleIndex = paymentSchedules.findIndex(s => s.id === id);
      if (scheduleIndex < 0) return;
      
      // Calculate the old percentage
      const oldPercentage = paymentSchedules[scheduleIndex].percentage;
      
      // Calculate the difference
      const difference = numValue - oldPercentage;
      
      // If no change or there's only one schedule, just update it
      if (difference === 0 || paymentSchedules.length === 1) {
        setPaymentSchedules(
          paymentSchedules.map(s => s.id === id ? { ...s, [field]: numValue } : s)
        );
        return;
      }
      
      // We need to adjust other percentages
      const updatedSchedules = [...paymentSchedules];
      updatedSchedules[scheduleIndex] = { ...updatedSchedules[scheduleIndex], percentage: numValue };
      
      // Distribute the difference across other schedules
      const otherSchedules = updatedSchedules.filter(s => s.id !== id);
      const totalOtherPercentage = otherSchedules.reduce((sum, s) => sum + s.percentage, 0);
      
      if (totalOtherPercentage === 0) {
        // Edge case - can't distribute
        toast.warning("Cannot adjust percentages - other items have 0%");
        return;
      }
      
      // Calculate a redistribution ratio for the other schedules
      const ratio = (totalOtherPercentage - difference) / totalOtherPercentage;
      
      // Apply the ratio to adjust each other schedule
      const adjustedSchedules = updatedSchedules.map(s => {
        if (s.id === id) return s; // Skip the one we're directly changing
        return {
          ...s,
          percentage: Math.max(0, Math.round(s.percentage * ratio))
        };
      });
      
      // Ensure the total is exactly 100%
      const adjustedTotal = adjustedSchedules.reduce((sum, s) => sum + s.percentage, 0);
      if (adjustedTotal !== 100) {
        // Find a non-zero item to adjust (preferably not the one we're changing)
        const itemToAdjust = adjustedSchedules.find(s => 
          s.id !== id && s.percentage > 0
        ) || adjustedSchedules.find(s => s.percentage > 0);
        
        if (itemToAdjust) {
          itemToAdjust.percentage += (100 - adjustedTotal);
        }
      }
      
      setPaymentSchedules(adjustedSchedules);
    } else {
      // For non-percentage fields (like dueDate), simply update the field
      setPaymentSchedules(
        paymentSchedules.map(s => s.id === id ? { ...s, [field]: value } : s)
      );
    }
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
    if (!shootingDate || !client) return;
    
    const formattedDate = format(shootingDate, 'yyyyMMdd');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) {
      toast.error('Client is required.');
      return;
    }

    if (!date || !dueDate) {
      toast.error('Date and Due Date are required.');
      return;
    }

    if (!selectedCompanyId) {
      toast.error('Please select a company first.');
      return;
    }

    if (!number.trim()) {
      toast.error('Invoice number is required.');
      return;
    }
    
    // Validate payment schedules total 100%
    const totalPercentage = paymentSchedules.reduce((total, schedule) => total + schedule.percentage, 0);
    if (totalPercentage !== 100) {
      toast.error('Payment schedule percentages must total 100%.');
      return;
    }

    const amount = calculateTotalAmount();

    try {
      if (isEditMode && invoice) {
        if (number !== invoice.number) {
          const allInvoices = await getInvoicesByDate();
          const duplicateExists = allInvoices.some(inv => inv.number === number && inv.id !== invoice.id);
          
          if (duplicateExists) {
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
          dueDate: format(dueDate, 'yyyy-MM-dd'),
          status,
          contractStatus,
          items,
          notes,
          contractTerms,
          viewLink: invoice.viewLink,
          paymentSchedules,
        };

        if (shootingDate) {
          updatedInvoice.shootingDate = format(shootingDate, 'yyyy-MM-dd');
        }

        await updateInvoice(updatedInvoice);
        toast.success('Invoice updated successfully!');
        
        // Fix: Use relative path instead of absolute URL
        navigate(`/invoice/${invoice.id}`);
      } else {
        const allInvoices = await getInvoicesByDate();
        const duplicateExists = allInvoices.some(inv => inv.number === number);
        
        if (duplicateExists) {
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
          dueDate: format(dueDate, 'yyyy-MM-dd'),
          status,
          contractStatus,
          items,
          notes,
          contractTerms,
          paymentSchedules,
        };

        if (shootingDate) {
          invoiceData.shootingDate = format(shootingDate, 'yyyy-MM-dd');
        }

        const newInvoice = await saveInvoice(invoiceData);
        toast.success('Invoice saved successfully!');
        
        if (newInvoice && newInvoice.id) {
          navigate(`/invoice/${newInvoice.id}`);
        } else if (job?.id) {
          navigate(`/job/${job.id}`);
        } else if (client) {
          navigate(`/client/${client.id}`);
        } else {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="number">Invoice Number</Label>
                <Input
                  type="text"
                  id="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                  placeholder="Auto-generated (YYYYMMDD-X)"
                  disabled={generatingInvoiceNumber}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isEditMode ? 
                    "You can change the invoice number, but it must be unique." : 
                    "Automatically generated with format YYYYMMDD-X. X is the sequence number for today."}
                </p>
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
                      onSelect={(newDate) => {
                        setDate(newDate);
                        if (!isEditMode && newDate) {
                          generateInvoiceNumber();
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>Default Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePicker
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Shooting Date</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !shootingDate && "text-muted-foreground"
                        )}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {shootingDate ? format(shootingDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DatePicker
                        mode="single"
                        selected={shootingDate}
                        onSelect={setShootingDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {shootingDate && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleAddToGoogleCalendar}
                      title="Add to Google Calendar"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
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
          
          {/* Payment Schedule Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Payment Schedule</h3>
              <Button type="button" onClick={handleAddPaymentSchedule} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Schedule
              </Button>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Due Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32 text-right">Percentage</TableHead>
                    <TableHead className="w-32 text-right">Amount</TableHead>
                    <TableHead className="w-28 text-right">Status</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal"
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
                              onSelect={(newDate) => {
                                if (newDate) {
                                  handlePaymentScheduleChange(
                                    schedule.id, 
                                    'dueDate', 
                                    format(newDate, 'yyyy-MM-dd')
                                  );
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="E.g., Deposit, Final Payment"
                          value={schedule.description || ''}
                          onChange={(e) => handlePaymentScheduleChange(schedule.id, 'description', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={schedule.percentage}
                            onChange={(e) => handlePaymentScheduleChange(
                              schedule.id, 
                              'percentage', 
                              parseInt(e.target.value, 10) || 0
                            )}
                            className="w-20 text-right"
                          />
                          <span className="ml-1">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency((calculateTotalAmount() * schedule.percentage) / 100)}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={schedule.status || 'unpaid'} 
                          onValueChange={(value) => handlePaymentScheduleChange(
                            schedule.id, 
                            'status', 
                            value
                          )}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePaymentSchedule(schedule.id)}
                          className="ml-auto h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Invoice Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Invoice Items</h3>
              <div className="flex space-x-2">
                <PackageSelector onSelect={handlePackageSelect} />
                <Button type="button" onClick={handleAddItem} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead style={{ width: '40%' }}>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className={activeRowId === item.id ? "bg-muted/30" : ""}>
                      <TableCell>
                        <Input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          className="w-16 text-right ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          min="0"
                          className="w-20 text-right ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicateItem(item.id)}
                            className="h-8 w-8"
                            title="Duplicate item"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  <TableRow className="bg-muted/10 font-medium">
                    <TableCell colSpan={3} className="text-right">Total:</TableCell>
                    <TableCell className="text-right">{formatCurrency(calculateTotalAmount())}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Notes Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes (will appear on invoice)</Label>
              <div className="mt-2">
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  placeholder="Enter any additional notes that should appear on the invoice..."
                  className="min-h-32"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="contractTerms">Contract Terms</Label>
              <div className="mt-2">
                <RichTextEditor
                  value={contractTerms}
                  onChange={setContractTerms}
                  placeholder="Enter contract terms and conditions..."
                  className="min-h-40"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
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
            <Button type="submit" disabled={loading}>
              {isEditMode ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default InvoiceForm;
