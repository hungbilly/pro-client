
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Invoice, InvoiceItem, PaymentSchedule } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface InvoiceFormContentProps {
  invoice: Invoice;
  errors: { [key: string]: string };
  saving: boolean;
  contractTemplates: Array<{
    id: string;
    name: string;
    content?: string;
    description?: string;
  }>;
  onChange: (field: keyof Invoice, value: any) => void;
  onItemsChange: (items: InvoiceItem[]) => void;
  onPaymentSchedulesChange: (paymentSchedules: PaymentSchedule[]) => void;
  onSubmit: (event?: React.FormEvent) => Promise<any>;
}

const InvoiceFormContent: React.FC<InvoiceFormContentProps> = ({
  invoice,
  errors,
  saving,
  contractTemplates,
  onChange,
  onItemsChange,
  onPaymentSchedulesChange,
  onSubmit
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    onItemsChange([...invoice.items, newItem]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...invoice.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // If quantity or rate changed, recalculate amount
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = Number(updatedItems[index].quantity) * Number(updatedItems[index].rate);
    }

    onItemsChange(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = [...invoice.items];
    updatedItems.splice(index, 1);
    onItemsChange(updatedItems);
  };

  const handleTermsTemplateChange = (templateId: string) => {
    if (templateId === 'none') {
      onChange('contractTerms', '');
      return;
    }

    const template = contractTemplates.find(t => t.id === templateId);
    if (template && template.content) {
      onChange('contractTerms', template.content);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">
            {invoice.id ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoice.number}
                onChange={(e) => onChange('number', e.target.value)}
                className={errors.number ? 'border-red-500' : ''}
              />
              {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number}</p>}
            </div>

            <div>
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : ''}
                onChange={(e) => onChange('date', e.target.value)}
                className={errors.date ? 'border-red-500' : ''}
              />
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => onChange('dueDate', e.target.value)}
                className={errors.dueDate ? 'border-red-500' : ''}
              />
              {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={invoice.status}
                onValueChange={(value) => onChange('status', value)}
              >
                <SelectTrigger id="status" className={errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
            </div>

            {invoice.contractTerms !== undefined && (
              <>
                <div className="col-span-2">
                  <Label htmlFor="contractTemplate">Contract Template</Label>
                  <Select
                    onValueChange={handleTermsTemplateChange}
                    defaultValue="none"
                  >
                    <SelectTrigger id="contractTemplate">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {contractTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="contractTerms">Contract Terms</Label>
                  <Textarea
                    id="contractTerms"
                    value={invoice.contractTerms || ''}
                    onChange={(e) => onChange('contractTerms', e.target.value)}
                    rows={10}
                  />
                </div>
              </>
            )}

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={invoice.notes || ''}
                onChange={(e) => onChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Invoice Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-left font-medium">Quantity</th>
                    <th className="px-4 py-2 text-left font-medium">Rate</th>
                    <th className="px-4 py-2 text-left font-medium">Amount</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <Input
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          min="0"
                          step="1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
              >
                Add Item
              </Button>
            </div>
            
            <div className="mt-4 text-right">
              <p className="text-lg font-bold">
                Total: {formatCurrency(invoice.amount)}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : (invoice.id ? 'Update Invoice' : 'Create Invoice')}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default InvoiceFormContent;
