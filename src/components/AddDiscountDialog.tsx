
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
  isOpen: boolean;
  onClose: () => void;
  onDiscountSelect: (items: InvoiceItem[]) => void;
  subtotal: number;
}

const AddDiscountDialog: React.FC<AddDiscountDialogProps> = ({
  isOpen,
  onClose,
  onDiscountSelect,
  subtotal,
}) => {
  const handleDiscountSelect = (items: InvoiceItem[]) => {
    onDiscountSelect(items);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
