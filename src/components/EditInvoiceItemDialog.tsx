
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RichTextEditor from '@/components/RichTextEditor';
import { InvoiceItem } from '@/types';

interface EditInvoiceItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InvoiceItem | null;
  onSave: (item: InvoiceItem) => void;
}

const EditInvoiceItemDialog: React.FC<EditInvoiceItemDialogProps> = ({
  open,
  onOpenChange,
  item,
  onSave,
}) => {
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);

  useEffect(() => {
    if (item) {
      setEditingItem({ ...item });
    }
  }, [item]);

  if (!editingItem) return null;

  const handleSave = () => {
    onSave(editingItem);
  };

  const updateAmount = (unitPrice: number, quantity: number) => {
    return unitPrice * quantity;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{item?.id ? 'Edit Item' : 'Add Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="item-description">Description</Label>
            <RichTextEditor
              id="item-description"
              value={editingItem.description}
              onChange={(value) =>
                setEditingItem({ ...editingItem, description: value })
              }
              className="mt-1"
              alwaysShowToolbar={true}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item-rate">Unit Price</Label>
              <Input
                id="item-rate"
                type="number"
                value={editingItem.rate}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value) || 0;
                  const amount = updateAmount(rate, editingItem.quantity);
                  setEditingItem({ ...editingItem, rate, amount });
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="item-quantity">Quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                value={editingItem.quantity}
                onChange={(e) => {
                  const quantity = parseFloat(e.target.value) || 1;
                  const amount = updateAmount(editingItem.rate, quantity);
                  setEditingItem({ ...editingItem, quantity, amount });
                }}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4">
            <Label>Total Amount: ${editingItem.amount.toLocaleString()}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditInvoiceItemDialog;
