
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveInvoice, updateInvoice, getClient } from '@/lib/storage';
import { Client, Invoice, InvoiceItem } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { Plus, Trash2, CreditCard, Send } from 'lucide-react';

interface InvoiceFormProps {
  clientId: string;
  existingInvoice?: Invoice;
}

const generateInvoiceNumber = (): string => {
  const prefix = 'INV';
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}-${date}-${random}`;
};

const calculateItemAmount = (quantity: number, rate: number): number => {
  return Number((quantity * rate).toFixed(2));
};

const calculateTotalAmount = (items: InvoiceItem[]): number => {
  return Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ clientId, existingInvoice }) => {
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Omit<Invoice, 'id' | 'viewLink'>>({
    clientId,
    number: existingInvoice?.number || generateInvoiceNumber(),
    amount: existingInvoice?.amount || 0,
    date: existingInvoice?.date || new Date().toISOString().split('T')[0],
    dueDate: existingInvoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: existingInvoice?.status || 'draft',
    items: existingInvoice?.items || [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: existingInvoice?.notes || '',
    contractTerms: existingInvoice?.contractTerms || `
1. Payment Terms: 50% deposit required to secure the date, with the remaining balance due 14 days before the wedding.

2. Cancellation Policy: If canceled more than 6 months before the event, the deposit is refundable minus a $200 administration fee. Cancellations within 6 months forfeit the deposit.

3. Schedule Changes: The client may reschedule once without penalty with at least 90 days notice, subject to availability.

4. Deliverables: Final edited images will be delivered within 6-8 weeks of the wedding date via online gallery.

5. Copyright: The photographer retains copyright of all images. The client receives a license for personal use.

6. Liability: The photographer's liability is limited to the contract amount in case of technical failure or inability to perform.

7. Model Release: The client grants permission to use images for portfolio, social media, and marketing purposes.
    `.trim()
  });

  // Fetch client details
  useEffect(() => {
    const fetchedClient = getClient(clientId);
    if (fetchedClient) {
      setClient(fetchedClient);
    } else {
      toast.error('Client not found');
      navigate('/');
    }
  }, [clientId, navigate]);

  // Update total amount when items change
  useEffect(() => {
    const total = calculateTotalAmount(formData.items);
    setFormData(prev => ({ ...prev, amount: total }));
  }, [formData.items]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { 
        ...updatedItems[index], 
        [name]: name === 'description' ? value : Number(value) 
      };
      
      // Recalculate item amount
      if (name === 'quantity' || name === 'rate') {
        updatedItems[index].amount = calculateItemAmount(
          name === 'quantity' ? Number(value) : updatedItems[index].quantity,
          name === 'rate' ? Number(value) : updatedItems[index].rate
        );
      }
      
      return { ...prev, items: updatedItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }
      ]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    } else {
      toast.error('Invoice must have at least one item');
    }
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Basic validation
      if (!formData.number || !formData.date || !formData.dueDate) {
        toast.error('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      // Validate items
      const invalidItems = formData.items.some(item => !item.description || item.quantity <= 0);
      if (invalidItems) {
        toast.error('Please fill in all invoice items correctly');
        setIsSubmitting(false);
        return;
      }

      const status = saveAsDraft ? 'draft' : 'sent';
      const updatedFormData = { ...formData, status };
      
      let invoice;
      
      if (existingInvoice) {
        invoice = updateInvoice({
          ...existingInvoice,
          ...updatedFormData
        });
        toast.success(`Invoice ${status === 'draft' ? 'saved as draft' : 'sent to client'}!`);
      } else {
        invoice = saveInvoice(updatedFormData);
        toast.success(`Invoice ${status === 'draft' ? 'created as draft' : 'sent to client'}!`);
      }
      
      navigate(`/client/${clientId}`);
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
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
      <form onSubmit={(e) => handleSubmit(e, false)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{existingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</span>
            <span className="text-sm font-normal text-muted-foreground">
              For client: <span className="font-medium text-foreground">{client.name}</span>
            </span>
          </CardTitle>
          <CardDescription>
            {existingInvoice 
              ? 'Update the invoice details and items.'
              : 'Create a new invoice with contract terms for your client.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number">Invoice Number <span className="text-destructive">*</span></Label>
              <Input
                id="number"
                name="number"
                value={formData.number}
                onChange={handleChange}
                placeholder="INV-20230101-0001"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Invoice Date <span className="text-destructive">*</span></Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date <span className="text-destructive">*</span></Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Invoice Items</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addItem}
                className="h-8 px-2"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-6">
                    <Input
                      name="description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="Item description"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      name="quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="Qty"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      name="rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, e)}
                      placeholder="Rate"
                      required
                    />
                  </div>
                  <div className="col-span-1 text-right py-2">
                    ${item.amount.toFixed(2)}
                  </div>
                  <div className="col-span-1">
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <div className="w-48 text-right">
                <div className="flex justify-between py-1 border-t">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">${formData.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <Label htmlFor="notes">Invoice Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes for the client..."
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contractTerms">
              Contract Terms <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-2">
                (The client will need to accept these terms)
              </span>
            </Label>
            <Textarea
              id="contractTerms"
              name="contractTerms"
              value={formData.contractTerms}
              onChange={handleChange}
              placeholder="Enter the terms and conditions for this contract..."
              rows={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/client/${clientId}`)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, true)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="sm:min-w-[120px]"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Send to Client'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default InvoiceForm;
