import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceItem } from '@/types';
import DiscountSelector from './DiscountSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AddDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDiscount: (discount: any) => void;
  subtotal?: number;
}

const AddDiscountDialog: React.FC<AddDiscountDialogProps> = ({
  open,
  onOpenChange,
  onAddDiscount,
  subtotal = 0,
}) => {
  const [manualAmount, setManualAmount] = useState<string>('');
  const [discountName, setDiscountName] = useState<string>('');
  const [discountDescription, setDiscountDescription] = useState<string>('');

  const handleDiscountSelect = (items: InvoiceItem[]) => {
    onAddDiscount(items);
    onOpenChange(false);
  };

  const handleManualDiscount = () => {
    const numericAmount = parseFloat(manualAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    const discountItem: InvoiceItem = {
      id: `manual-discount-${Date.now()}`,
      name: discountName || `$${numericAmount} Off`,
      description: discountDescription || 'Manual fixed amount discount',
      quantity: 1,
      rate: -numericAmount,
      amount: -numericAmount,
    };

    onAddDiscount([discountItem]);
    onOpenChange(false);
  };

  const isManualDiscountValid = () => {
    const numericAmount = parseFloat(manualAmount);
    return !isNaN(numericAmount) && 
           numericAmount > 0 && 
           discountName.trim().length > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Discount</DialogTitle>
          <DialogDescription>
            Choose from saved discounts or create a manual discount
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Saved Discounts</TabsTrigger>
            <TabsTrigger value="manual">Manual Discount</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates">
            <DiscountSelector 
              onDiscountSelect={handleDiscountSelect} 
              variant="dialog"
              subtotal={subtotal}
            />
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Discount Name</Label>
                <Input
                  value={discountName}
                  onChange={(e) => setDiscountName(e.target.value)}
                  placeholder="Enter discount name"
                />
              </div>

              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="Enter discount amount"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={discountDescription}
                  onChange={(e) => setDiscountDescription(e.target.value)}
                  placeholder="Enter discount description (optional)"
                  className="resize-none"
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleManualDiscount}
                disabled={!isManualDiscountValid()}
                className="w-full"
              >
                Apply Manual Discount
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddDiscountDialog;
