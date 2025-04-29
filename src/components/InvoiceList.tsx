
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Invoice, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Copy, Eye, FileEdit, Trash2, AreaChart, ArrowUp, ArrowDown } from 'lucide-react';
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

// Type for sorting configuration
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

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
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'date', direction: 'desc' });
  const queryClient = useQueryClient();
  const { id: jobId } = useParams();
  
  React.useEffect(() => {
    setLocalInvoices(invoices);
    
    // Debug logging for received invoices
    console.log('[InvoiceList] Received invoices:', invoices);
    
    // Check for shootingDate field
    const hasShootingDates = invoices.some(inv => inv.shootingDate);
    console.log('[InvoiceList] Any invoices have shootingDate?', hasShootingDates);
    
    if (hasShootingDates) {
      const samplesWithDates = invoices
        .filter(inv => inv.shootingDate)
        .map(inv => ({ 
          id: inv.id, 
          number: inv.number, 
          shootingDate: inv.shootingDate 
        }));
      console.log('[InvoiceList] Samples with shooting dates:', samplesWithDates);
    } else {
      console.log('[InvoiceList] No shooting dates found in any invoices');
      console.log('[InvoiceList] Sample invoice structure:', 
        invoices.length > 0 ? JSON.stringify(invoices[0], null, 2) : 'No invoices');
    }
  }, [invoices]);
  
  // Function to handle column sorting
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // Toggle direction
        return { key, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      // New column, default to ascending
      return { key, direction: 'asc' };
    });
  };

  // Function to get sorting indicator
  const getSortIndicator = (columnKey: string) => {
    if (sortConfig.key === columnKey) {
      if (sortConfig.direction === 'asc') {
        return <ArrowUp className="inline-block ml-1 h-4 w-4" />;
      } else {
        return <ArrowDown className="inline-block ml-1 h-4 w-4" />;
      }
    }
    return null;
  };
  
  const sortedInvoices = React.useMemo(() => {
    console.log('[InvoiceList] Sorting invoices with config:', { sortBy, sortConfig });
    
    let result = [...localInvoices];
    
    // First apply the select box filter (invoice-date or job-date)
    result = result.sort((a, b) => {
      if (sortBy === 'invoice-date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        const dateA = a.shootingDate ? new Date(a.shootingDate) : new Date(a.date);
        const dateB = b.shootingDate ? new Date(b.shootingDate) : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      }
    });
    
    // Then apply the column sorting if it's not based on the dropdown
    if (sortConfig.key !== 'date' && sortConfig.key !== 'shootingDate') {
      result = result.sort((a, b) => {
        let aValue, bValue;
        
        // Extract values based on the sort column
        switch (sortConfig.key) {
          case 'number':
            aValue = a.number || '';
            bValue = b.number || '';
            break;
          case 'dueDate':
            aValue = new Date(a.dueDate).getTime();
            bValue = new Date(b.dueDate).getTime();
            break;
          case 'amount':
            aValue = a.amount || 0;
            bValue = b.amount || 0;
            break;
          case 'status':
            // Custom order for status: paid -> accepted -> sent -> draft
            const statusOrder = { 'paid': 1, 'accepted': 2, 'sent': 3, 'draft': 4 };
            aValue = statusOrder[a.status] || 999;
            bValue = statusOrder[b.status] || 999;
            break;
          case 'contractStatus':
            aValue = a.contractStatus === 'accepted' ? 1 : 2;
            bValue = b.contractStatus === 'accepted' ? 1 : 2;
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }
        
        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        // Handle numeric comparison
        return sortConfig.direction === 'asc'
          ? (aValue > bValue ? 1 : -1)
          : (aValue < bValue ? 1 : -1);
      });
    }

    console.log('[InvoiceList] Sorted invoices (first few):', 
      result.slice(0, 3).map(inv => ({
        id: inv.id,
        number: inv.number,
        date: inv.date,
        shootingDate: inv.shootingDate
      }))
    );
    
    return result;
  }, [localInvoices, sortBy, sortConfig]);

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
                <TableHead 
                  className="cursor-pointer" 
                  onClick={() => handleSort('number')}
                >
                  Invoice # {getSortIndicator('number')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('date')}
                >
                  Invoice Date {getSortIndicator('date')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('dueDate')}
                >
                  Due Date {getSortIndicator('dueDate')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('shootingDate')}
                >
                  Job Date {getSortIndicator('shootingDate')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('amount')}
                >
                  Amount {getSortIndicator('amount')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  Status {getSortIndicator('status')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('contractStatus')}
                >
                  Contract {getSortIndicator('contractStatus')}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => {
                console.log(`[InvoiceList] Rendering invoice ${invoice.id}, shootingDate:`, invoice.shootingDate);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.shootingDate ? (
                        <div className="flex items-center">
                          <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          {new Date(invoice.shootingDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
