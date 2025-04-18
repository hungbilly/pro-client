
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InvoiceItem } from '@/types';
import DiscountSelector from './DiscountSelector';

interface AddDiscountDialogProps {
  open: boolean; // Changed from isOpen to open
  onOpenChange: (open: boolean) => void; // Changed from onClose to onOpenChange
  onAddDiscount: (discount: any) => void; // Changed from onDiscountSelect
  subtotal?: number; // Made optional
}

const AddDiscountDialog: React.FC<AddDiscountDialogProps> = ({
  open,
  onOpenChange,
  onAddDiscount,
  subtotal = 0, // Default value provided
}) => {
  const handleDiscountSelect = (items: InvoiceItem[]) => {
    onAddDiscount(items);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Discount</DialogTitle>
        </DialogHeader>
        <DiscountSelector 
          onDiscountSelect={handleDiscountSelect} 
          variant="dialog"
          subtotal={subtotal}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddDiscountDialog;
