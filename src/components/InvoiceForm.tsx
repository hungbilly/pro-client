import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Invoice, InvoiceItem, Job, PaymentSchedule, PaymentStatus, InvoiceStatus, ContractStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, CalendarPlus, Pencil, Copy, Package as PackageIcon, AlertCircle, Briefcase, Mail, User, BadgePercent, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getClient, saveInvoice, updateInvoice, getJob, getInvoice, getInvoicesByDate, deleteInvoice } from '@/lib/storage';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { useCompany } from './CompanySelector';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PackageSelector from './PackageSelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import QuillEditor from './QuillEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import AddProductPackageDialog from './AddProductPackageDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import AddDiscountDialog from './AddDiscountDialog';
import PaymentScheduleTable from './invoice/PaymentScheduleTable';
import SaveAsTemplateDialog from './SaveAsTemplateDialog';

export interface InvoiceFormProps {
  invoice?: Invoice;
  clientId?: string;
  jobId?: string;
  invoiceId?: string;
  isEditView?: boolean;
  contractTemplates: ContractTemplate[];
  checkDuplicateInvoiceNumber: (number: string, currentInvoiceId?: string) => Promise<boolean>;
  onInvoiceDeleted: (invoiceId: string) => void;
  currency?: string;
}

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

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

const generateViewLink = () => {
  return Math.random().toString(36).substring(2, 15);
};

const defaultInvoice = {
  id: '', 
  clientId: '',
  jobId: '',
  number: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  dueDate: format(new Date(), 'yyyy-MM-dd'),
  items: [],
  amount: 0,
  status: 'draft' as InvoiceStatus,
  contractStatus: 'pending' as ContractStatus,
  notes: '',
  contractTerms: '',
  paymentSchedules: [],
  companyId: '',
  viewLink: '',
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  invoice: propInvoice, 
  clientId: propClientId, 
  jobId: propJobId, 
  invoiceId: propInvoiceId,
  isEditView = false,
  contractTemplates = [],
  checkDuplicateInvoiceNumber,
  onInvoiceDeleted,
  currency = 'USD'
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  console.log("InvoiceForm received isEditView prop:", isEditView);

  const [invoice, setInvoice] = useState<Invoice>(
    propInvoice || defaultInvoice
  );
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [isNumberValid, setIsNumberValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showAddDiscountDialog, setShowAddDiscountDialog] = useState(false);
  const [showSaveAsTemplateDialog, setShowSaveAsTemplateDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [isGeneratingInvoiceNumber, setIsGeneratingInvoiceNumber] = useState(false);

  useEffect(() => {
    console.log("InvoiceForm mounted with props:", { 
      propInvoice, 
      propClientId, 
      propJobId, 
      propInvoiceId,
      hasContractTemplates: contractTemplates?.length > 0
    });
    console.log("Current invoice state:", invoice);
    console.log("User:", user);
    console.log("Selected company:", selectedCompany);
    
    if (!propInvoice && !invoice.number) {
      generateInvoiceNumber();
    }
  }, []);

  useEffect(() => {
    if (propInvoice) {
      setInvoice(propInvoice);
    }
  }, [propInvoice]);

  useEffect(() => {
    const fetchClient = async () => {
      if (invoice.clientId) {
        const clientData = await getClient(invoice.clientId);
        setClient(clientData);
      }
    };

    fetchClient();
  }, [invoice.clientId]);

  useEffect(() => {
    const fetchJob = async () => {
      if (invoice.jobId) {
        const jobData = await getJob(invoice.jobId);
        setJob(jobData);
      }
    };

    fetchJob();
  }, [invoice.jobId]);

  const generateInvoiceNumber = async () => {
    try {
      setIsGeneratingInvoiceNumber(true);
      console.log("Generating invoice number");
      
      const today = new Date();
      const datePrefix = format(today, 'yyyyMMdd');
      
      const todayInvoices = await getInvoicesByDate(format(today, 'yyyy-MM-dd'));
      console.log("Today's invoices:", todayInvoices);
      
      const sequenceNumbers = todayInvoices
        .map(inv => {
          const match = inv.number?.match(new RegExp(`^${datePrefix}-(\\d+)$`));
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => num > 0);
      
      const highestSequence = sequenceNumbers.length > 0 
        ? Math.max(...sequenceNumbers) 
        : 0;
      
      const newSequence = highestSequence + 1;
      const newInvoiceNumber = `${datePrefix}-${newSequence}`;
      console.log("Generated invoice number:", newInvoiceNumber);
      
      setInvoice(prev => ({
        ...prev,
        number: newInvoiceNumber
      }));
      
      // Clear validation errors for number field
      setValidationErrors(prev => ({
        ...prev,
        number: ''
      }));
      
    } catch (error) {
      console.error("Error generating invoice number:", error);
      toast.error("Failed to generate invoice number");
    } finally {
      setIsGeneratingInvoiceNumber(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log("Input changed:", { name, value });
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      [name]: value,
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDateChange = (date: Date | undefined, name: string) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setInvoice(prevInvoice => ({
        ...prevInvoice,
        [name]: formattedDate,
      }));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...invoice.items];
    
    const item = updatedItems[index];
    if (field === 'unitPrice') {
      item.rate = value;
    } else {
      item[field] = value;
    }
    
    if (field === 'quantity' || field === 'rate' || field === 'unitPrice') {
      item.amount = item.quantity * item.rate;
    }
    
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      items: updatedItems,
    }));
  };

  const handleRemoveItem = (id: string) => {
    setInvoice(prevInvoice => {
      const updatedItems = prevInvoice.items.filter(item => item.id !== id);
      return { ...prevInvoice, items: updatedItems };
    });
  };

  const handlePackageSelect = (items: InvoiceItem[]) => {
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      items: [...prevInvoice.items, ...items],
    }));
  };

  const calculateTotal = useCallback(() => {
    let total = 0;
    invoice.items.forEach(item => {
      total += item.quantity * item.rate;
    });
    return total;
  }, [invoice.items]);

  useEffect(() => {
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      amount: calculateTotal(),
    }));
  }, [invoice.items, calculateTotal]);

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Check if invoice number is empty or consists only of whitespace
    // Add null check before calling trim()
    if (!invoice.number || invoice.number.trim() === '') {
      errors.number = 'Invoice number is required';
    }
    
    if (invoice.items.length === 0) {
      errors.items = 'At least one item is required';
    }
    
    const paymentSchedules = invoice.paymentSchedules || [];
    if (paymentSchedules.length > 0) {
      const totalPercentage = paymentSchedules.reduce((sum, schedule) => sum + schedule.percentage, 0);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.paymentSchedules = `Payment schedules must total exactly 100%. Current total: ${totalPercentage.toFixed(2)}%`;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Form submission initiated");
    e.preventDefault();
    console.log("Default form behavior prevented");
    
    // Ensure the invoice number is trimmed of whitespace
    // Add null check before calling trim()
    setInvoice(prev => ({
      ...prev,
      number: prev.number ? prev.number.trim() : ''
    }));
    
    if (!validateForm()) {
      console.error("Validation failed", validationErrors);
      
      if (validationErrors.paymentSchedules) {
        toast.error(validationErrors.paymentSchedules, {
          duration: 5000
        });
      } else {
        toast.error('Please fix the errors in the form');
      }
      return;
    }

    setIsSaving(true);
    console.log("Setting saving state to true");
    
    try {
      // Ensure we have a date set and number is properly trimmed with null check
      const invoiceToSave = {
        ...invoice,
        date: invoice.date || format(new Date(), 'yyyy-MM-dd'),
        number: invoice.number ? invoice.number.trim() : '' // Ensure number is trimmed with null check
      };
      
      console.log("Preparing to save invoice with data:", {
        id: invoiceToSave.id,
        clientId: invoiceToSave.clientId,
        jobId: invoiceToSave.jobId,
        date: invoiceToSave.date,
        number: invoiceToSave.number,
        items: invoiceToSave.items.length,
        status: invoiceToSave.status,
        userId: user?.id,
        companyId: selectedCompany?.id
      });
      
      let savedInvoice;
      if (invoiceToSave.id) {
        console.log("Updating existing invoice:", invoiceToSave.id);
        savedInvoice = await updateInvoice(invoiceToSave);
        console.log("Invoice updated successfully");
        toast.success('Invoice updated successfully!');
      } else {
        console.log("Creating new invoice");
        const newInvoice = { 
          ...invoiceToSave, 
          userId: user?.id, 
          companyId: selectedCompany?.id || '', 
          clientId: propClientId || invoiceToSave.clientId, 
          jobId: propJobId || invoiceToSave.jobId 
        };
        console.log("New invoice data:", newInvoice);
        savedInvoice = await saveInvoice(newInvoice);
        console.log("Invoice saved successfully");
        toast.success('Invoice saved successfully!');
      }
      
      navigate(`/invoice/${savedInvoice.id}`);
      
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice.');
    } finally {
      console.log("Setting saving state to false");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirmation(false);
    if (!invoice.id) return;

    setIsDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      toast.success("Invoice deleted successfully");
      if (onInvoiceDeleted) {
        onInvoiceDeleted(invoice.id);
      }
      if (invoice.jobId) {
        navigate(`/job/${invoice.jobId}`);
      } else if (invoice.clientId) {
        navigate(`/client/${invoice.clientId}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error("Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTemplateSelect = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const applyTemplate = () => {
    if (selectedTemplate) {
      setInvoice(prevInvoice => {
        // Save the current date and number
        const currentDate = prevInvoice.date || format(new Date(), 'yyyy-MM-dd');
        // Add null check for number
        const currentNumber = prevInvoice.number || '';
        
        return {
          ...prevInvoice,
          contractTerms: selectedTemplate.content || '',
          // Ensure date and number are preserved when applying a template
          date: currentDate,
          number: currentNumber
        };
      });
    }
    setIsDialogOpen(false);
  };

  const handlePaymentScheduleChange = (index: number, field: string, value: any) => {
    const updatedSchedules = [...(invoice.paymentSchedules || [])];
    const total = calculateTotal();
    
    if (field === 'amount') {
      const numericAmount = parseFloat(value);
      if (!isNaN(numericAmount)) {
        const percentageValue = total > 0 ? (numericAmount / total) * 100 : 0;
        updatedSchedules[index] = {
          ...updatedSchedules[index],
          percentage: Math.round(percentageValue * 100) / 100,
          amount: numericAmount
        };
      }
    } else if (field === 'percentage') {
      const numericPercentage = parseFloat(value);
      if (!isNaN(numericPercentage)) {
        const amountValue = (total * numericPercentage) / 100;
        updatedSchedules[index] = {
          ...updatedSchedules[index],
          percentage: numericPercentage,
          amount: amountValue
        };
      }
    } else if (field === 'dueDate') {
      updatedSchedules[index] = {
        ...updatedSchedules[index],
        dueDate: value
      };
    } else if (field === 'description') {
      updatedSchedules[index] = {
        ...updatedSchedules[index],
        description: value
      };
    } else if (field === 'status') {
      updatedSchedules[index] = {
        ...updatedSchedules[index],
        status: value
      };
    } else if (field === 'paymentDate') {
      updatedSchedules[index] = {
        ...updatedSchedules[index],
        paymentDate: value
      };
    }
    
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      paymentSchedules: updatedSchedules,
    }));
    
    const totalPercentage = updatedSchedules.reduce((sum, schedule) => sum + (schedule.percentage || 0), 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01 && (field === 'percentage' || field === 'amount')) {
      toast.warning(`Total payment percentage is ${totalPercentage.toFixed(2)}%. It should be exactly 100%.`, {
        duration: 4000,
      });
    }
  };

  const handleUpdatePaymentAmount = (paymentId: string, amount: number, percentage: number) => {
    console.log('Handling payment amount update:', { paymentId, amount, percentage });
    
    setInvoice(prevInvoice => {
      const updatedSchedules = prevInvoice.paymentSchedules?.map(schedule => {
        if (schedule.id === paymentId) {
          return {
            ...schedule,
            amount,
            percentage
          };
        }
        return schedule;
      }) || [];
      
      return {
        ...prevInvoice,
        paymentSchedules: updatedSchedules,
      };
    });
    
    toast.success('Payment amount updated successfully', {
      duration: 3000
    });
  };

  const handleUpdatePaymentDescription = (paymentId: string, description: string) => {
    setInvoice(prevInvoice => {
      const updatedSchedules = prevInvoice.paymentSchedules?.map(schedule => {
        if (schedule.id === paymentId) {
          return {
            ...schedule,
            description
          };
        }
        return schedule;
      }) || [];
      
      return {
        ...prevInvoice,
        paymentSchedules: updatedSchedules,
      };
    });
  };

  const handleUpdatePaymentStatus = (paymentId: string, status: PaymentStatus) => {
    setInvoice(prevInvoice => {
      const updatedSchedules = prevInvoice.paymentSchedules?.map(schedule => {
        if (schedule.id === paymentId) {
          const updatedSchedule = {
            ...schedule,
            status
          };
          
          if (status === 'paid' && !schedule.paymentDate) {
            updatedSchedule.paymentDate = format(new Date(), 'yyyy-MM-dd');
          }
          
          return updatedSchedule;
        }
        return schedule;
      }) || [];
      
      return {
        ...prevInvoice,
        paymentSchedules: updatedSchedules,
      };
    });
  };

  const handleUpdatePaymentDate = (paymentId: string, paymentDate: string) => {
    setInvoice(prevInvoice => {
      const updatedSchedules = prevInvoice.paymentSchedules?.map(schedule => {
        if (schedule.id === paymentId) {
          return {
            ...schedule,
            paymentDate
          };
        }
        return schedule;
      }) || [];
      
      return {
        ...prevInvoice,
        paymentSchedules: updatedSchedules,
      };
    });
  };

  const handleAddPaymentSchedule = () => {
    const total = calculateTotal();
    const currentSchedules = invoice.paymentSchedules || [];
    
    const totalAllocatedPercentage = currentSchedules.reduce((sum, schedule) => 
      sum + (schedule.percentage || 0), 0
    );
    
    const remainingPercentage = 100 - totalAllocatedPercentage;
    const scheduleCount = currentSchedules.length;

    if (remainingPercentage <= 0) {
      toast.error("All payment percentage (100%) has been allocated");
      return;
    }

    // Default percentage for new schedule
    let newPercentage: number;
    if (scheduleCount === 0) {
      // First payment: Default to 100%
      newPercentage = 100;
    } else {
      // Subsequent payments: Use remaining percentage
      newPercentage = remainingPercentage;
    }

    const newSchedule: PaymentSchedule = {
      id: generateId(),
      percentage: newPercentage,
      amount: (total * newPercentage) / 100,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'unpaid',
      description: getOrdinalNumber(scheduleCount + 1) + ' Payment'
    };

    setInvoice(prevInvoice => ({
      ...prevInvoice,
      paymentSchedules: [...(prevInvoice.paymentSchedules || []), newSchedule]
    }));
  };

  const openAddProductDialog = () => {
    setShowAddProductDialog(true);
  };

  const openAddDiscountDialog = () => {
    setShowAddDiscountDialog(true);
  };

  const handleAddDiscountDialog = (items: InvoiceItem[]) => {
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      items: [...prevInvoice.items, ...items],
    }));
    setShowAddDiscountDialog(false);
  };

  const renderRichTextContent = (content: string) => {
    return { __html: content };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleRemovePaymentSchedule = (id: string) => {
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      paymentSchedules: (prevInvoice.paymentSchedules || []).filter(schedule => schedule.id !== id)
    }));
    
    toast.success("Payment schedule removed");
  };

  const renderItems = () => {
    const regularItems = invoice.items.filter(item => item.rate >= 0);
    
    return regularItems.map((item, index) => (
      <TableRow 
        key={item.id} 
        className={cn(
          "align-top",
          item.rate < 0 && "bg-blue-50/50 dark:bg-blue-950/20"
        )}
      >
        <TableCell className="font-medium">
          {item.name || item.description.split('\n')[0]}
        </TableCell>
        <TableCell>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={renderRichTextContent(item.description)}
          />
        </TableCell>
        <TableCell>${Math.abs(item.rate).toFixed(2)}</TableCell>
        <TableCell>{item.quantity}</TableCell>
        <TableCell>{item.discount || '0%'}</TableCell>
        <TableCell>No Tax</TableCell>
        <TableCell className={cn(
          "text-right font-medium",
          item.rate < 0 && "text-blue-600 dark:text-blue-400"
        )}>
          ${(item.quantity * Math.abs(item.rate)).toFixed(2)}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end space-x-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleRemoveItem(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  const renderDiscounts = () => {
    const discountItems = invoice.items.filter(item => item.rate < 0);
    
    return discountItems.map((item, index) => (
      <TableRow key={item.id} className="bg-blue-50/50 dark:bg-blue-950/20">
        <TableCell className="font-medium">{item.name}</TableCell>
        <TableCell>{item.description}</TableCell>
        <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
          -${Math.abs(item.rate * item.quantity).toFixed(2)}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end space-x-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleRemoveItem(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  const getOrdinalNumber = (num: number): string => {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{invoice.id ? 'Edit Invoice' : 'Create Invoice'}</CardTitle>
        <CardDescription>
          {invoice.id ? 'Update the invoice details below.' : 'Enter the invoice details below.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="number">Invoice Number</Label>
              {!invoice.id && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateInvoiceNumber}
                  disabled={isGeneratingInvoiceNumber}
                  className="text-xs h-6 px-2"
                >
                  {isGeneratingInvoiceNumber ? 'Generating...' : 'Generate'}
                </Button>
              )}
            </div>
            <Input
              type="text"
              id="number"
              name="number"
              value={invoice.number}
              onChange={handleInputChange}
              placeholder="e.g., 20250416-1"
              className={validationErrors.number ? "border-red-500" : ""}
              required
            />
            {validationErrors.number && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.number}</p>
            )}
            {!isNumberValid && (
              <p className="text-sm text-red-500 mt-1">Invoice number already exists.</p>
            )}
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select name="status" value={invoice.status} onValueChange={(value) => setInvoice(prev => ({ ...prev, status: value as Invoice['status'] }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sent">Not Accepted</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="date">Invoice Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !invoice.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {invoice.date ? format(new Date(invoice.date), "PPP") : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DatePicker
                mode="single"
                selected={invoice.date ? new Date(invoice.date) : undefined}
                onSelect={(date) => handleDateChange(date as Date, 'date')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <div className="flex flex-col space-y-2">
            <h3 className="text-lg font-medium">Products & Packages</h3>
            <p className="text-sm text-gray-500">Add products and packages to this invoice.</p>
            
            {validationErrors.items && (
              <Alert variant="warning" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationErrors.items}
                </AlertDescription>
              </Alert>
            )}
            
            {invoice.items.length === 0 ? (
              <div className="bg-slate-50 rounded-lg p-8 text-center">
                <h3 className="text-lg font-medium mb-2">Start Adding Items to your Invoice</h3>
                <p className="text-muted-foreground mb-6">
                  You currently don't have any product or package added to
                  your Invoice. Click the button below to start adding them.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={openAddProductDialog} className="bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Products & Packages
                  </Button>
                  <Button onClick={openAddDiscountDialog} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                    <BadgePercent className="mr-2 h-4 w-4" />
                    Add Discount
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Item</TableHead>
                      <TableHead className="w-[350px]">Description</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderItems()}
                  </TableBody>
                </Table>
                
                {invoice.items.some(item => item.rate < 0) && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Discount Name</TableHead>
                          <TableHead className="w-[350px]">Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renderDiscounts()}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                <div className="flex justify-between p-4 border-t">
                  <div className="flex space-x-4">
                    <Button variant="outline" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={openAddProductDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Products & Packages
                    </Button>
                    <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50" onClick={openAddDiscountDialog}>
                      <BadgePercent className="mr-2 h-4 w-4" />
                      Add Discount
                    </Button>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between">
                      <span className="font-medium mr-8">Subtotal:</span>
                      <span className="font-medium">${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 mr-8">Total Due:</span>
                      <span className="font-bold">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            value={invoice.notes}
            onChange={handleInputChange}
            placeholder="Enter any additional notes here..."
            className="min-h-[120px]"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="contractTerms">Terms & Conditions</Label>
            <div>
              <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                Choose Template
              </Button>
            </div>
          </div>
          <QuillEditor value={invoice.contractTerms || ''} onChange={(value) => setInvoice(prev => ({ ...prev, contractTerms: value }))} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Payment Schedule</Label>
            <Badge 
              variant={invoice.paymentSchedules?.reduce((sum, s) => sum + (s.percentage || 0), 0) === 100 ? "default" : "outline"}
              className={invoice.paymentSchedules?.reduce((sum, s) => sum + (s.percentage || 0), 0) === 100 
                ? "bg-green-100 text-green-800" 
                : "bg-amber-100 text-amber-800"}
            >
              Total: {(invoice.paymentSchedules?.reduce((sum, s) => sum + (s.percentage || 0), 0) || 0).toFixed(2)}%
            </Badge>
          </div>
          {validationErrors.paymentSchedules && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validationErrors.paymentSchedules}
              </AlertDescription>
            </Alert>
          )}
          
          {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 && (
            <PaymentScheduleTable
              paymentSchedules={invoice.paymentSchedules || []}
              amount={calculateTotal()}
              isClientView={false}
              updatingPaymentId={null}
              onUpdateStatus={handleUpdatePaymentStatus}
              formatCurrency={formatCurrency}
              onUpdatePaymentDate={handleUpdatePaymentDate}
              onUpdateAmount={handleUpdatePaymentAmount}
              onUpdateDescription={handleUpdatePaymentDescription}
              onRemovePaymentSchedule={handleRemovePaymentSchedule}
            />
          )}
          
          <Button variant="outline" onClick={handleAddPaymentSchedule} className="mt-4">
            Add Payment Schedule
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteConfirmation(true)}
            disabled={!invoice.id || isSaving || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Invoice'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSaveAsTemplateDialog(true)}
            disabled={isSaving || invoice.items.length === 0}
            className="flex items-center"
          >
            <Save className="mr-2 h-4 w-4" />
            Save as Template
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (invoice.jobId) {
                navigate(`/job/${invoice.jobId}`);
              } else if (invoice.clientId) {
                navigate(`/client/${invoice.clientId}`);
              } else {
                navigate('/');
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Invoice'}
          </Button>
        </div>
      </CardFooter>

      <AddProductPackageDialog 
        open={showAddProductDialog} 
        onOpenChange={setShowAddProductDialog} 
        onAddItems={handlePackageSelect}
      />

      <AddDiscountDialog 
        open={showAddDiscountDialog} 
        onOpenChange={setShowAddDiscountDialog} 
        onAddDiscount={handleAddDiscountDialog} 
        subtotal={calculateTotal()}
      />

      <SaveAsTemplateDialog 
        open={showSaveAsTemplateDialog} 
        onOpenChange={setShowSaveAsTemplateDialog} 
        invoice={invoice}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Contract Template</DialogTitle>
            <DialogDescription>
              Choose a template for your contract terms and conditions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {contractTemplates.length === 0 ? (
              <p className="text-center text-muted-foreground">No contract templates found.</p>
            ) : (
              contractTemplates.map((template) => (
                <Card key={template.id} className={`p-4 cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id ? 'border-primary bg-primary/5' : ''
                }`} onClick={() => setSelectedTemplate(template)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyTemplate} disabled={!selectedTemplate}>
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

InvoiceForm.displayName = 'InvoiceForm';

export default InvoiceForm;
