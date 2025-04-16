
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
import RichTextEditor from './RichTextEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

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

// Helper functions first to avoid use-before-declaration errors
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
  const company = useCompany();

  const [invoice, setInvoice] = useState<Invoice>(
    propInvoice || {
      id: '', // Set an empty string as default for id
      clientId: propClientId || '',
      jobId: propJobId || '',
      number: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      items: [{ 
        id: generateId(), 
        description: '', 
        quantity: 1, 
        rate: 0, 
        amount: 0 
      }],
      amount: 0,
      status: 'draft',
      notes: '',
      contractTerms: '', 
      paymentSchedules: [],
      companyId: company?.id || '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      [name]: value,
    }));
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
    
    // Convert the item to have properties matching InvoiceItem
    const item = updatedItems[index];
    if (field === 'unitPrice') {
      // Handle unitPrice to rate conversion
      item.rate = value;
    } else {
      // Set the field directly
      item[field] = value;
    }
    
    // Update amount based on quantity and rate
    if (field === 'quantity' || field === 'rate' || field === 'unitPrice') {
      item.amount = item.quantity * item.rate;
    }
    
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      items: updatedItems,
    }));
  };

  const handleAddItem = () => {
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      items: [...prevInvoice.items, { 
        id: generateId(), 
        description: '', 
        quantity: 1, 
        rate: 0,
        amount: 0
      }],
    }));
  };

  const handleRemoveItem = (id: string) => {
    setInvoice(prevInvoice => {
      const updatedItems = prevInvoice.items.filter(item => item.id !== id);
      return { ...prevInvoice, items: updatedItems };
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice.number) {
      toast.error('Invoice number is required.');
      return;
    }

    if (checkDuplicateInvoiceNumber) {
      const isDuplicate = await checkDuplicateInvoiceNumber(invoice.number, invoice.id);
      if (isDuplicate) {
        setIsNumberValid(false);
        toast.error('Invoice number already exists.');
        return;
      } else {
        setIsNumberValid(true);
      }
    }

    setIsSaving(true);
    try {
      if (invoice.id) {
        await updateInvoice(invoice);
        toast.success('Invoice updated successfully!');
      } else {
        const newInvoice = { 
          ...invoice, 
          userId: user?.id, 
          companyId: company?.id || '', 
          clientId: propClientId || invoice.clientId, 
          jobId: propJobId || invoice.jobId 
        };
        await saveInvoice(newInvoice);
        toast.success('Invoice saved successfully!');
      }
      
      if (invoice.jobId) {
        navigate(`/job/${invoice.jobId}`);
      } else if (invoice.clientId) {
        navigate(`/client/${invoice.clientId}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice.');
    } finally {
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
    updatedSchedules[index] = {
      ...updatedSchedules[index],
      [field]: value
    };
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      paymentSchedules: updatedSchedules,
    }));
  };

  const handleAddPaymentSchedule = () => {
    setInvoice(prevInvoice => ({
      ...prevInvoice,
      paymentSchedules: [...(prevInvoice.paymentSchedules || []), { 
        id: generateId(), 
        dueDate: format(new Date(), 'yyyy-MM-dd'), 
        percentage: 0, 
        status: 'unpaid',
        description: 'Payment'
      }],
    }));
  };

  const handleRemovePaymentSchedule = (id: string) => {
    setInvoice(prevInvoice => {
      const updatedSchedules = prevInvoice.paymentSchedules?.filter(schedule => schedule.id !== id) || [];
      return { ...prevInvoice, paymentSchedules: updatedSchedules };
    });
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
            <Label htmlFor="number">Invoice Number</Label>
            <Input
              type="text"
              id="number"
              name="number"
              value={invoice.number}
              onChange={handleInputChange}
              placeholder="INV-001"
              required
            />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
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
            <Label htmlFor="dueDate">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !invoice.dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {invoice.dueDate ? format(new Date(invoice.dueDate), "PPP") : (
                    <span>Pick a due date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePicker
                  mode="single"
                  selected={invoice.dueDate ? new Date(invoice.dueDate) : undefined}
                  onSelect={(date) => handleDateChange(date as Date, 'dueDate')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <Label>Items</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    ${(item.quantity * item.rate).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" className="mt-2 w-full" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <RichTextEditor value={invoice.notes} onChange={(value) => setInvoice(prev => ({ ...prev, notes: value }))} />
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
          <RichTextEditor value={invoice.contractTerms || ''} onChange={(value) => setInvoice(prev => ({ ...prev, contractTerms: value }))} />
        </div>

        <div>
          <Label>Payment Schedule</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Due Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Percentage</TableHead>
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
                    <Input
                      type="text"
                      value={schedule.description}
                      onChange={(e) => handlePaymentScheduleChange(index, 'description', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={schedule.percentage}
                      onChange={(e) => handlePaymentScheduleChange(index, 'percentage', Number(e.target.value))}
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
          <Button type="submit" onClick={handleSubmit} disabled={isSaving}>
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
    </Card>
  );
};

// Add default export
export default InvoiceForm;
