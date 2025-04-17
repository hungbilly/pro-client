import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Invoice, InvoiceItem, Job, PaymentSchedule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, CalendarPlus, Pencil, Copy, Package as PackageIcon, AlertCircle, Briefcase, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
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

const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

const generateViewLink = () => {
  return Math.random().toString(36).substring(2, 15);
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  invoice: propInvoice, 
  clientId: propClientId, 
  jobId: propJobId, 
  invoiceId: propInvoiceId,
  contractTemplates = [],
  checkDuplicateInvoiceNumber,
  onInvoiceDeleted
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  const [invoice, setInvoice] = useState<Invoice>(
    propInvoice || {
      id: '', 
      clientId: propClientId || '',
      jobId: propJobId || '',
      number: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      items: [],
      amount: 0,
      status: 'draft',
      notes: '',
      contractTerms: '', 
      paymentSchedules: [],
      companyId: selectedCompany?.id || '',
      viewLink: generateViewLink(),
    }
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
    
    if (!invoice.number) {
      errors.number = 'Invoice number is required';
    }
    
    if (invoice.items.length === 0) {
      errors.items = 'At least one item is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Form submission initiated");
    e.preventDefault();
    console.log("Default form behavior prevented");
    
    if (!validateForm()) {
      console.error("Validation failed", validationErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    console.log("Checking for duplicate invoice number");
    if (checkDuplicateInvoiceNumber) {
      const isDuplicate = await checkDuplicateInvoiceNumber(invoice.number, invoice.id);
      console.log("Duplicate check result:", isDuplicate);
      if (isDuplicate) {
        setIsNumberValid(false);
        setValidationErrors(prev => ({
          ...prev,
          number: 'Invoice number already exists'
        }));
        toast.error('Invoice number already exists.');
        return;
      } else {
        setIsNumberValid(true);
      }
    }

    setIsSaving(true);
    console.log("Setting saving state to true");
    
    try {
      console.log("Preparing to save invoice with data:", {
        id: invoice.id,
        clientId: invoice.clientId,
        jobId: invoice.jobId,
        items: invoice.items.length,
        status: invoice.status,
        userId: user?.id,
        companyId: selectedCompany?.id
      });
      
      if (invoice.id) {
        console.log("Updating existing invoice:", invoice.id);
        await updateInvoice(invoice);
        console.log("Invoice updated successfully");
        toast.success('Invoice updated successfully!');
      } else {
        console.log("Creating new invoice");
        const newInvoice = { 
          ...invoice, 
          userId: user?.id, 
          companyId: selectedCompany?.id || '', 
          clientId: propClientId || invoice.clientId, 
          jobId: propJobId || invoice.jobId 
        };
        console.log("New invoice data:", newInvoice);
        await saveInvoice(newInvoice);
        console.log("Invoice saved successfully");
        toast.success('Invoice saved successfully!');
      }
      
      console.log("Preparing navigation after save");
      if (invoice.jobId) {
        console.log("Navigating to job page:", invoice.jobId);
        navigate(`/job/${invoice.jobId}`);
      } else if (invoice.clientId) {
        console.log("Navigating to client page:", invoice.clientId);
        navigate(`/client/${invoice.clientId}`);
      } else {
        console.log("Navigating to home page");
        navigate('/');
      }
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
      setInvoice(prevInvoice => ({
        ...prevInvoice,
        contractTerms: selectedTemplate.content || '',
      }));
    }
    setIsDialogOpen(false);
  };

  const handlePaymentScheduleChange = (index: number, field: string, value: any) => {
    const updatedSchedules = [...(invoice.paymentSchedules || [])];
    
    if (field === 'amount') {
      const percentageValue = calculateTotal() > 0 ? (value / calculateTotal()) * 100 : 0;
      updatedSchedules[index] = {
        ...updatedSchedules[index],
        percentage: Math.round(percentageValue * 100) / 100,
      };
    } else {
      updatedSchedules[index] = {
        ...updatedSchedules[index],
        [field]: value
      };
    }
    
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      paymentSchedules: updatedSchedules,
    }));
    
    const totalPercentage = updatedSchedules.reduce((sum, schedule) => sum + schedule.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01 && field === 'percentage') {
      toast.warning(`Total payment percentage is ${totalPercentage}%. It should be exactly 100%.`, {
        duration: 4000,
      });
    }
  };

  const handleAddPaymentSchedule = () => {
    const existingPercentageTotal = invoice.paymentSchedules?.reduce((sum, schedule) => sum + schedule.percentage, 0) || 0;
    
    const newPercentage = Math.max(0, Math.min(100 - existingPercentageTotal, 100));
    
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      paymentSchedules: [...(prevInvoice.paymentSchedules || []), { 
        id: generateId(), 
        dueDate: format(new Date(), 'yyyy-MM-dd'), 
        percentage: newPercentage,
        status: 'unpaid',
        description: newPercentage === 100 ? 'Full Payment' : (existingPercentageTotal === 0 ? 'Deposit' : 'Balance')
      }],
    }));
    
    if (existingPercentageTotal >= 100) {
      toast.warning('Total payment percentage exceeds 100%. Please adjust the percentages.', {
        duration: 4000,
      });
    }
  };

  const openAddProductDialog = () => {
    setShowAddProductDialog(true);
  };

  const renderRichTextContent = (content: string) => {
    return { __html: content };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
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
                <Button onClick={openAddProductDialog} className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Products & Packages
                </Button>
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
                    {invoice.items.map((item, index) => (
                      <TableRow key={item.id} className="align-top">
                        <TableCell className="font-medium">
                          {item.name || item.description.split('\n')[0]}
                        </TableCell>
                        <TableCell>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={renderRichTextContent(item.description)}
                          />
                        </TableCell>
                        <TableCell>${item.rate.toFixed(2)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.discount || '0%'}</TableCell>
                        <TableCell>No Tax</TableCell>
                        <TableCell className="text-right font-medium">
                          ${(item.quantity * item.rate).toFixed(2)}
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
                    ))}
                  </TableBody>
                </Table>
                
                <div className="flex justify-between p-4 border-t">
                  <div>
                    <Button variant="outline" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={openAddProductDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Products & Packages
                    </Button>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between">
                      <span className="font-medium mr-8">Subtotal:</span>
                      <span className="font-medium">${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 mr-8">Discount:</span>
                      <span className="text-gray-500">None</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold mr-8">Total Due:</span>
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
          <Label>Payment Schedule</Label>
          <div className="flex justify-between items-center mb-2">
            <Label>Payment Schedule</Label>
            <Badge 
              variant={invoice.paymentSchedules?.reduce((sum, s) => sum + s.percentage, 0) === 100 ? "default" : "outline"}
              className={invoice.paymentSchedules?.reduce((sum, s) => sum + s.percentage, 0) === 100 
                ? "bg-green-100 text-green-800" 
                : "bg-amber-100 text-amber-800"}
            >
              Total: {invoice.paymentSchedules?.reduce((sum, s) => sum + s.percentage, 0) || 0}%
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Due Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoice.paymentSchedules || []).map((schedule, index) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !schedule.dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {schedule.dueDate ? format(new Date(schedule.dueDate), "PPP") : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePicker
                          mode="single"
                          selected={schedule.dueDate ? new Date(schedule.dueDate) : undefined}
                          onSelect={(date) => handlePaymentScheduleChange(index, 'dueDate', format(date as Date, 'yyyy-MM-dd'))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={schedule.description === 'Deposit' ? 'deposit' : 
                            schedule.description === 'Balance' ? 'balance' : 
                            schedule.description === 'Full Payment' ? 'full_payment' : 'custom'}
                      onValueChange={(value) => {
                        let description = '';
                        switch(value) {
                          case 'deposit':
                            description = 'Deposit';
                            break;
                          case 'balance':
                            description = 'Balance';
                            break;
                          case 'full_payment':
                            description = 'Full Payment';
                            break;
                          case 'custom':
                            description = schedule.description;
                            break;
                        }
                        handlePaymentScheduleChange(index, 'description', description);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="balance">Balance</SelectItem>
                        <SelectItem value="full_payment">Full Payment</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {(schedule.description !== 'Deposit' && 
                      schedule.description !== 'Balance' && 
                      schedule.description !== 'Full Payment') && (
                      <Input
                        className="mt-2"
                        type="text"
                        value={schedule.description}
                        onChange={(e) => handlePaymentScheduleChange(index, 'description', e.target.value)}
                        placeholder="Custom description"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={schedule.percentage}
                      onChange={(e) => handlePaymentScheduleChange(index, 'percentage', Number(e.target.value))}
                      min="0"
                      max="100"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={(calculateTotal() * schedule.percentage / 100).toFixed(2)}
                      onChange={(e) => handlePaymentScheduleChange(index, 'amount', Number(e.target.value))}
                      min="0"
                      max={calculateTotal()}
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={schedule.status} onValueChange={(value) => handlePaymentScheduleChange(index, 'status', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="write-off">Write-off</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleRemovePaymentSchedule(schedule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" className="mt-2 w-full" onClick={handleAddPaymentSchedule}>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment Schedule
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {invoice.id ? (
          <Button variant="destructive" onClick={() => setShowDeleteConfirmation(true)} disabled={isDeleting}>
            {isDeleting ? (
              <>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        ) : (
          <div></div>
        )}
        <div className="flex gap-2">
          <Button 
            type="button"
            onClick={(e) => {
              console.log("Save button clicked");
              handleSubmit(e);
            }} 
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                Saving...
              </>
            ) : (
              <>
                {invoice.id ? 'Update Invoice' : 'Create Invoice'}
              </>
            )}
          </Button>
        </div>
      </CardFooter>

      <Dialog open={isDialogOpen} onOpenChange={() => setIsDialogOpen(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
            <DialogDescription>
              Choose a template to apply to the terms and conditions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {contractTemplates.map((template) => (
              <div key={template.id} className="border rounded-md p-4 cursor-pointer hover:bg-secondary" onClick={() => handleTemplateSelect(template)}>
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" onClick={applyTemplate}>
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirmation} onOpenChange={() => setShowDeleteConfirmation(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowDeleteConfirmation(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  Deleting...
                </>
              ) : (
                <>
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddProductPackageDialog 
        isOpen={showAddProductDialog}
        onClose={() => setShowAddProductDialog(false)}
        onPackageSelect={handlePackageSelect}
      />
    </Card>
  );
};

export default InvoiceForm;
