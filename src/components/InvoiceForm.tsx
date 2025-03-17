import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Invoice, InvoiceItem, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, Camera, CalendarPlus, GripVertical, Pencil, Copy, Package as PackageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getClient, saveInvoice, updateInvoice, getJob } from '@/lib/storage';
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
  clientId: string;
  jobId?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice: existingInvoice, clientId, jobId }) => {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [number, setNumber] = useState(existingInvoice?.number || '');
  const [date, setDate] = useState<Date | null>(existingInvoice ? new Date(existingInvoice.date) : new Date());
  const [dueDate, setDueDate] = useState<Date | null>(existingInvoice ? new Date(existingInvoice.dueDate) : new Date());
  const [shootingDate, setShootingDate] = useState<Date | null>(existingInvoice?.shootingDate ? new Date(existingInvoice.shootingDate) : null);
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'paid'>(existingInvoice?.status || 'draft');
  const [contractStatus, setContractStatus] = useState<'pending' | 'accepted'>(existingInvoice?.contractStatus || 'pending');
  const [items, setItems] = useState<InvoiceItem[]>(existingInvoice?.items || [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [notes, setNotes] = useState(existingInvoice?.notes || '');
  const [contractTerms, setContractTerms] = useState(existingInvoice?.contractTerms || '');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { user } = useAuth();

  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (clientId) {
        const fetchedClient = await getClient(clientId);
        if (fetchedClient) {
          setClient(fetchedClient);
        } else {
          toast.error('Client not found.');
        }
      }
    };

    const fetchJobData = async () => {
      if (jobId) {
        const fetchedJob = await getJob(jobId);
        if (fetchedJob) {
          setJob(fetchedJob);
        } else {
          toast.error('Job not found.');
        }
      }
    };

    fetchClientData();
    if (jobId) {
      fetchJobData();
    }

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
    
    if (user) {
      fetchTemplates();
    }
  }, [clientId, jobId, user]);

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
    
    // Log the current state after update
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

    const amount = calculateTotalAmount();

    const invoiceData: Omit<Invoice, 'id' | 'viewLink'> = {
      clientId: client.id,
      companyId: selectedCompanyId,
      jobId,
      number,
      amount,
      date: format(date, 'yyyy-MM-dd'),
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      status,
      contractStatus,
      items,
      notes,
      contractTerms,
    };

    if (shootingDate) {
      invoiceData.shootingDate = format(shootingDate, 'yyyy-MM-dd');
    }

    try {
      if (existingInvoice) {
        const updatedInvoice: Invoice = {
          id: existingInvoice.id,
          clientId: client.id,
          companyId: selectedCompanyId,
          jobId,
          number,
          amount,
          date: format(date, 'yyyy-MM-dd'),
          dueDate: format(dueDate, 'yyyy-MM-dd'),
          status,
          contractStatus,
          items,
          notes,
          contractTerms,
          viewLink: existingInvoice.viewLink,
        };

        if (shootingDate) {
          updatedInvoice.shootingDate = format(shootingDate, 'yyyy-MM-dd');
        }

        await updateInvoice(updatedInvoice);
        toast.success('Invoice updated successfully!');
      } else {
        await saveInvoice(invoiceData);
        toast.success('Invoice saved successfully!');
      }
      
      if (jobId) {
        navigate(`/job/${jobId}`);
      } else {
        navigate(`/client/${client.id}`);
      }
    } catch (error) {
      console.error('Failed to save/update invoice:', error);
      toast.error('Failed to save/update invoice.');
    }
  };

  if (!client) {
    return (
      <Card className="w-full max-w-5xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center p-8">Loading client data...</div>
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
        <CardTitle>{existingInvoice ? 'Edit Invoice' : 'Create Invoice'}</CardTitle>
        <CardDescription>
          {job ? `Creating invoice for job: ${job.title}` : 'Fill in the details to create the invoice.'}
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
                />
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
              
              <div>
                <Label>Due Date</Label>
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
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-28 text-right">Unit Price</TableHead>
                    <TableHead className="w-24 text-right">Quantity</TableHead>
                    <TableHead className="w-24 text-right">Discount</TableHead>
                    <TableHead className="w-24 text-right">Tax</TableHead>
                    <TableHead className="w-32 text-right">Amount</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="p-2 text-center">
                        <GripVertical className="h-4 w-4 mx-auto text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        {activeRowId === item.id ? (
                          <RichTextEditor
                            value={item.description}
                            onChange={(value) => handleItemChange(item.id, 'description', value)}
                            className="border-none min-h-0 p-0"
                            placeholder="Add description..."
                            alwaysShowToolbar={true}
                            showDoneButton={true}
                            onDone={handleDoneEditing}
                          />
                        ) : (
                          item.description ? (
                            <RichTextEditor
                              value={item.description}
                              onChange={(value) => handleItemChange(item.id, 'description', value)}
                              className="border-none min-h-0 p-0"
                              placeholder="Add description..."
                              onFocus={() => setActiveRowId(item.id)}
                            />
                          ) : (
                            <div className="space-y-1">
                              <PackageSelector 
                                onPackageSelect={handlePackageSelect} 
                                variant="inline" 
                                placeholder="Select an existing package..." 
                              />
                              <Button 
                                variant="ghost" 
                                className="w-full justify-start text-left text-muted-foreground hover:text-foreground"
                                onClick={() => handleManualPackageEntry(item.id)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Add your own product/package...
                              </Button>
                            </div>
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="max-w-24 text-right ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="max-w-16 text-right ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          placeholder="0%"
                          defaultValue="0%"
                          className="max-w-16 text-right ml-auto"
                          disabled
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          placeholder="No Tax"
                          defaultValue="No Tax"
                          className="max-w-16 text-right ml-auto"
                          disabled
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="notes">Invoice Notes</Label>
              <RichTextEditor
                value={notes}
                onChange={(value) => setNotes(value)}
                placeholder="Enter invoice notes..."
              />
            </div>
            
            <div>
              <Label htmlFor="contractTerms">Contract Terms</Label>
              <RichTextEditor
                value={contractTerms}
                onChange={(value) => setContractTerms(value)}
                placeholder="Enter contract terms..."
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            if (jobId) {
              navigate(`/job/${jobId}`);
            } else if (client) {
              navigate(`/client/${client.id}`);
            } else {
              navigate('/');
            }
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit}>{existingInvoice ? 'Update Invoice' : 'Create Invoice'}</Button>
      </CardFooter>
    </Card>
  );
};

export default InvoiceForm;
