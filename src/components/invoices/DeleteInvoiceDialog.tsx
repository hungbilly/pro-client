
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteInvoice } from '@/lib/storage';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DeleteInvoiceDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  disabled?: boolean;
}

const DeleteInvoiceDialog: React.FC<DeleteInvoiceDialogProps> = ({ 
  invoiceId, 
  invoiceNumber,
  disabled = false
}) => {
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      console.log('Attempting to delete invoice:', invoiceId);
      const success = await deleteInvoice(invoiceId);
      
      if (success) {
        toast.success('Invoice deleted successfully.');
        navigate('/invoices');
      } else {
        toast.error('Failed to delete invoice.');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice.');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm" 
          disabled={disabled}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete Invoice
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Invoice {invoiceNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the invoice
            and all associated data including payment schedules and invoice items.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteInvoiceDialog;
