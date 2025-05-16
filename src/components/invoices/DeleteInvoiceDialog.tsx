
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteInvoiceDialogProps {
  invoiceId: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteInvoiceDialog: React.FC<DeleteInvoiceDialogProps> = ({ 
  invoiceId, 
  onClose, 
  onConfirm 
}) => {
  return (
    <AlertDialog open={!!invoiceId} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the invoice
            and all associated data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteInvoiceDialog;
