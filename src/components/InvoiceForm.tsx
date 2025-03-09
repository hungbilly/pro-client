
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client, Invoice, InvoiceItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { getClient, saveInvoice, updateInvoice } from '@/lib/storage';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';

interface InvoiceFormProps {
  invoice?: Invoice;
  clientId?: string;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice: existingInvoice, clientId: predefinedClientId }) => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [number, setNumber] = useState(existingInvoice?.number || '');
  const [date, setDate] = useState<Date | null>(existingInvoice ? new Date(existingInvoice.date) : new Date());
  const [dueDate, setDueDate] = useState<Date | null>(existingInvoice ? new Date(existingInvoice.dueDate) : new Date());
  const [shootingDate, setShootingDate] = useState<Date | null>(existingInvoice?.shootingDate ? new Date(existingInvoice.shootingDate) : null);
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'paid'>(existingInvoice?.status || 'draft');
  const [items, setItems] = useState<InvoiceItem[]>(existingInvoice?.items || [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }]);
  const [notes, setNotes] = useState(existingInvoice?.notes || '');
  const [contractTerms, setContractTerms] = useState(existingInvoice?.contractTerms || '');

  const clientId = predefinedClientId || clientIdParam || existingInvoice?.clientId || '';

  useEffect(() => {
    const fetchClient = async () => {
      if (clientId) {
        const fetchedClient = await getClient(clientId);
        if (fetchedClient) {
          setClient(fetchedClient);
        } else {
          // Handle case where client is not found
          toast.error('Client not found.');
          // Redirect or other error handling
        }
      }
    };

    fetchClient();
  }, [clientId]);

  const calculateTotalAmount = () => {
    return items.reduce((total, item) => total + item.amount, 0);
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        const quantity = field === 'quantity' ? value : item.quantity;
        const rate = field === 'rate' ? value : item.rate;
        updatedItem.amount = quantity * rate;
        return updatedItem;
      }
      return item;
    }));
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

    const amount = calculateTotalAmount();

    const invoiceData: Omit<Invoice, 'id' | 'viewLink'> = {
      clientId: client.id,
      number,
      amount,
      date: format(date, 'yyyy-MM-dd'),
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      status,
      items,
      notes,
      contractTerms,
    };

    // Add shooting date if it exists
    if (shootingDate) {
      invoiceData.shootingDate = format(shootingDate, 'yyyy-MM-dd');
    }

    try {
      if (existingInvoice) {
        // Update existing invoice
        const updatedInvoice: Invoice = {
          id: existingInvoice.id,
          clientId: client.id,
          number,
          amount,
          date: format(date, 'yyyy-MM-dd'),
          dueDate: format(dueDate, 'yyyy-MM-dd'),
          status,
          items,
          notes,
          contractTerms,
          viewLink: existingInvoice.viewLink,
        };

        // Add shooting date if it exists
        if (shootingDate) {
          updatedInvoice.shootingDate = format(shootingDate, 'yyyy-MM-dd');
        }

        await updateInvoice(updatedInvoice);
        toast.success('Invoice updated successfully!');
      } else {
        // Save new invoice
        await saveInvoice(invoiceData);
        toast.success('Invoice saved successfully!');
      }
      navigate(`/client/${client.id}`);
    } catch (error) {
      console.error('Failed to save/update invoice:', error);
      toast.error('Failed to save/update invoice.');
    }
  };

  if (!client) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center p-8">Loading client data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{existingInvoice ? 'Edit Invoice' : 'Create Invoice'}</CardTitle>
        <CardDescription>Fill in the details to {existingInvoice ? 'update' : 'create'} the invoice.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <Label>Shooting Date</Label>
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
            </div>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
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
            <Label>Items</Label>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
                <Input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                />
                <Input
                  type="number"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value))}
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={item.amount}
                  readOnly
                />
                <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Invoice notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contractTerms">Contract Terms</Label>
            <Textarea
              id="contractTerms"
              placeholder="Contract terms"
              value={contractTerms}
              onChange={(e) => setContractTerms(e.target.value)}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/client/${client.id}`)}>Cancel</Button>
        <Button onClick={handleSubmit}>{existingInvoice ? 'Update Invoice' : 'Create Invoice'}</Button>
      </CardFooter>
    </Card>
  );
};

export default InvoiceForm;
