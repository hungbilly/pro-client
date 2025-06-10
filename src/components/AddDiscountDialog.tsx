
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountName, setDiscountName] = useState<string>('');
  const [discountDescription, setDiscountDescription] = useState<string>('');

  const handleDiscountSelect = (items: InvoiceItem[]) => {
    onAddDiscount(items);
    onOpenChange(false);
  };

  const calculateDiscountAmount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) return 0;

    if (discountType === 'percentage') {
      return (subtotal * value) / 100;
    } else {
      return value;
    }
  };

  const handleManualDiscount = () => {
    const discountAmount = calculateDiscountAmount();
    if (discountAmount <= 0) return;

    const discountItem: InvoiceItem = {
      id: `manual-discount-${Date.now()}`,
      name: discountName || (discountType === 'percentage' ? `${discountValue}% Off` : `$${discountValue} Off`),
      description: discountDescription || `Manual ${discountType} discount`,
      quantity: 1,
      rate: -discountAmount,
      amount: -discountAmount,
    };

    onAddDiscount([discountItem]);
    onOpenChange(false);
    
    // Reset form
    setDiscountValue('');
    setDiscountName('');
    setDiscountDescription('');
    setDiscountType('fixed');
  };

  const isManualDiscountValid = () => {
    const value = parseFloat(discountValue);
    return !isNaN(value) && 
           value > 0 && 
           discountName.trim().length > 0;
  };

  const previewAmount = calculateDiscountAmount();

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{discountType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}</Label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                    min="0"
                    max={discountType === 'percentage' ? "100" : undefined}
                    step={discountType === 'percentage' ? "1" : "0.01"}
                  />
                </div>
              </div>

              {previewAmount > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Discount Preview:</div>
                  <div className="font-medium text-red-600">-${previewAmount.toFixed(2)}</div>
                  {discountType === 'percentage' && (
                    <div className="text-xs text-muted-foreground">
                      {discountValue}% of ${subtotal.toFixed(2)} subtotal
                    </div>
                  )}
                </div>
              )}

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
