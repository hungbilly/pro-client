
import React, { memo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PaymentDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isUpdating: boolean;
}

const PaymentDateDialog = memo(({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isUpdating
}: PaymentDateDialogProps) => {
  const today = new Date();
  const formattedDate = format(today, 'MMMM d, yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this payment as paid? The payment date will be set to today ({formattedDate}).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isUpdating}
            type="button"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isUpdating}
            type="button"
          >
            {isUpdating ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

PaymentDateDialog.displayName = 'PaymentDateDialog';

export default PaymentDateDialog;
