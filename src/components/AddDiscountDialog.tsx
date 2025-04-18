
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [manualAmount, setManualAmount] = useState<string>('');

  const handleDiscountSelect = (items: InvoiceItem[]) => {
    onAddDiscount(items);
    onOpenChange(false);
  };

  const handleManualDiscount = () => {
    const numericAmount = parseFloat(manualAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    const discountAmount = discountType === 'percentage' 
      ? (subtotal * numericAmount) / 100
      : numericAmount;

    const discountItem: InvoiceItem = {
      id: `manual-discount-${Date.now()}`,
      name: `${discountType === 'percentage' ? `${numericAmount}% Off` : `$${numericAmount} Off`}`,
      description: `Manual ${discountType === 'percentage' ? 'percentage' : 'fixed amount'} discount`,
      quantity: 1,
      rate: -discountAmount,
      amount: -discountAmount,
    };

    onAddDiscount([discountItem]);
    onOpenChange(false);
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
                <Label>Discount Type</Label>
                <RadioGroup
                  value={discountType}
                  onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage">Percentage (%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">Fixed Amount ($)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                  min="0"
                  max={discountType === 'percentage' ? "100" : undefined}
                  step="0.01"
                />
              </div>

              <Button 
                onClick={handleManualDiscount}
                disabled={!manualAmount || parseFloat(manualAmount) <= 0}
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
