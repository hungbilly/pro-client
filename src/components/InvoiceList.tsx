
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Invoice, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Copy, Eye, FileEdit, Trash2, AreaChart } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { deleteInvoice } from '@/lib/storage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface InvoiceListProps {
  invoices: Invoice[];
  client: Client;
  showCreateButton?: boolean;
  onInvoiceDeleted?: (invoiceId: string) => void;
}

const getStatusColor = (status: Invoice['status']) => {
  switch (status) {
    case 'draft':
      return 'bg-muted text-muted-foreground';
    case 'sent':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'accepted':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'paid':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getContractStatusColor = (status?: 'pending' | 'accepted') => {
  switch (status) {
    case 'accepted':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }
};

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, client, showCreateButton = true, onInvoiceDeleted }) => {
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<string | null>(null);
  const [localInvoices, setLocalInvoices] = React.useState<Invoice[]>(invoices);
  const [sortBy, setSortBy] = React.useState<'invoice-date' | 'job-date'>('invoice-date');
  const queryClient = useQueryClient();
  const { id: jobId } = useParams();
  
  React.useEffect(() => {
    setLocalInvoices(invoices);
  }, [invoices]);
  
  const sortedInvoices = React.useMemo(() => {
    return [...localInvoices].sort((a, b) => {
      if (sortBy === 'invoice-date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        const dateA = a.shootingDate ? new Date(a.shootingDate) : new Date(a.date);
        const dateB = b.shootingDate ? new Date(b.shootingDate) : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      }
    });
  }, [localInvoices, sortBy]);

  const copyInvoiceLink = (invoice: Invoice, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    navigator.clipboard.writeText(invoice.viewLink)
      .then(() => toast.success('Invoice link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoice(invoiceToDelete);
      toast.success("Invoice deleted successfully");
      
      setLocalInvoices(prev => prev.filter(invoice => invoice.id !== invoiceToDelete));
      
      if (onInvoiceDeleted) {
        onInvoiceDeleted(invoiceToDelete);
      }
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client', client.id] });
      
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ['job', jobId] });
        queryClient.invalidateQueries({ queryKey: ['job-invoices', jobId] });
      }
      
      setInvoiceToDelete(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error("Failed to delete invoice");
    }
  };

  const confirmDeleteInvoice = (e: React.MouseEvent, invoiceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setInvoiceToDelete(invoiceId);
  };

  return (
    <div className="space-y-8">
      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
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
              onClick={handleDeleteInvoice} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Invoices</h2>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'invoice-date' | 'job-date')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice-date">Sort by Invoice Date</SelectItem>
              <SelectItem value="job-date">Sort by Job Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showCreateButton && (
          <Button asChild>
            <Link to={`/invoice/create/${client.id}`}>
              <FileEdit className="h-4 w-4 mr-2" />
              Create Invoice
            </Link>
          </Button>
        )}
      </div>
      
      {sortedInvoices.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <AreaChart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Invoices Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {showCreateButton 
              ? "You haven't created any invoices for this client yet. Create your first invoice to get started."
              : "No invoices have been created for this client yet. Invoices can be created from the job page."}
          </p>
          {showCreateButton && (
            <Button asChild>
              <Link to={`/invoice/create/${client.id}`}>
                <FileEdit className="h-4 w-4 mr-2" />
                Create First Invoice
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                {sortBy === 'job-date' && <TableHead>Job Date</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  {sortBy === 'job-date' && (
                    <TableCell>
                      {invoice.shootingDate && (
                        <div className="flex items-center">
                          <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          {new Date(invoice.shootingDate).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="font-semibold">${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.contractStatus && (
                      <Badge className={getContractStatusColor(invoice.contractStatus)}>
                        {invoice.contractStatus === 'accepted' ? 'Accepted' : 'Not Accepted'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      {invoice.status !== 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Copy client link"
                          onClick={(e) => copyInvoiceLink(invoice, e)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <Link to={`/invoice/${invoice.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Delete invoice"
                        onClick={(e) => confirmDeleteInvoice(e, invoice.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
