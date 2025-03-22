
import React, { memo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

interface PaymentDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isUpdating: boolean;
}

const PaymentDateDialog = memo(({
  open,
  onOpenChange,
  paymentDate,
  onDateSelect,
  onConfirm,
  onCancel,
  isUpdating
}: PaymentDateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Payment Date</DialogTitle>
          <DialogDescription>
            When was this payment received? Please select a date.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="payment-date">Payment Date</Label>
            <DatePicker
              id="payment-date"
              selected={paymentDate}
              onSelect={(date) => {
                console.log('[DatePicker] Date selected:', date);
                onDateSelect(date);
              }}
            />
            {!paymentDate && (
              <p className="text-sm text-red-500 mt-1">Please select a payment date</p>
            )}
          </div>
        </div>
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
            disabled={!paymentDate || isUpdating}
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
