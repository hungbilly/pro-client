import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Invoice, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CalendarDays, Copy, Eye, FileEdit, Trash2, AreaChart, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { deleteInvoice } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import AcceptanceStatusDots from '@/components/invoices/AcceptanceStatusDots';
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
  companyCurrency?: string;
}

// Type for sorting configuration
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

// Helper function to check if invoice is accepted (based on status or timestamp)
const isInvoiceAccepted = (invoice: Invoice) => {
  return invoice.status === 'accepted' || invoice.status === 'paid' || !!invoice.invoice_accepted_at;
};

// Helper function to check if contract is accepted
const isContractAccepted = (invoice: Invoice) => {
  return !!(invoice.contract_accepted_at || invoice.contract_accepted_by || (invoice.contractStatus === 'accepted'));
};

// Helper function to calculate paid amount from payment schedules
const getPaidAmount = (invoice: Invoice) => {
  if (!invoice.paymentSchedules || !Array.isArray(invoice.paymentSchedules)) {
    return 0;
  }
  
  return invoice.paymentSchedules
    .filter(schedule => schedule.status === 'paid')
    .reduce((total, schedule) => total + (schedule.amount || 0), 0);
};

const InvoiceList: React.FC<InvoiceListProps> = ({ 
  invoices, 
  client, 
  showCreateButton = true, 
  onInvoiceDeleted,
  companyCurrency = 'USD'
}) => {
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<string | null>(null);
  const [localInvoices, setLocalInvoices] = React.useState<Invoice[]>(invoices);
  const [sortBy, setSortBy] = React.useState<'invoice-date' | 'job-date'>('invoice-date');
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'date', direction: 'desc' });
  const queryClient = useQueryClient();
  const { id: jobId } = useParams();
  const [jobDates, setJobDates] = React.useState<Record<string, string | null>>({});
  
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, date');
      return data || [];
    },
  });

  React.useEffect(() => {
    const jobDateMap: Record<string, string | null> = {};
    jobs.forEach((job) => {
      jobDateMap[job.id] = job.date;
    });
    
    console.log('[InvoiceList] Job dates map:', jobDateMap);
    setJobDates(jobDateMap);
    
  }, [jobs]);
  
  React.useEffect(() => {
    setLocalInvoices(invoices);
    
    console.log('[InvoiceList] Received invoices:', invoices);
    
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
        
      const invoicesWithJobIds = invoices.filter(inv => inv.jobId);
      console.log('[InvoiceList] Invoices with jobIds:', 
        invoicesWithJobIds.map(inv => ({ id: inv.id, number: inv.number, jobId: inv.jobId })));
    }
  }, [invoices]);
  
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

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
    
    result = result.sort((a, b) => {
      if (sortBy === 'invoice-date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        const dateA = a.shootingDate ? new Date(a.shootingDate).getTime() : 
                     (a.jobId && jobDates[a.jobId] ? new Date(jobDates[a.jobId]).getTime() : 0);
        const dateB = b.shootingDate ? new Date(b.shootingDate).getTime() : 
                     (b.jobId && jobDates[b.jobId] ? new Date(jobDates[b.jobId]).getTime() : 0);
        return dateB - dateA;
      }
    });
    
    if (sortConfig.key !== 'date' && sortConfig.key !== 'shootingDate') {
      result = result.sort((a, b) => {
        let aValue, bValue;
        
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
          case 'paid':
            aValue = getPaidAmount(a);
            bValue = getPaidAmount(b);
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
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
        shootingDate: inv.shootingDate,
        jobId: inv.jobId,
        jobDate: inv.jobId && jobDates[inv.jobId] ? jobDates[inv.jobId] : null
      }))
    );
    
    return result;
  }, [localInvoices, sortBy, sortConfig, jobDates]);

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

  const getJobDateDisplay = (invoice: Invoice) => {
    if (invoice.shootingDate) {
      return new Date(invoice.shootingDate).toLocaleDateString();
    }
    
    if (invoice.jobId && jobDates[invoice.jobId]) {
      return new Date(jobDates[invoice.jobId]).toLocaleDateString();
    }
    
    return <span className="text-muted-foreground text-sm">Not set</span>;
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
        <div className="rounded-md border overflow-hidden">
          <ScrollArea className="w-full overflow-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer whitespace-nowrap" 
                    onClick={() => handleSort('number')}
                  >
                    Invoice # {getSortIndicator('number')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('date')}
                  >
                    Invoice Date {getSortIndicator('date')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('dueDate')}
                  >
                    Due Date {getSortIndicator('dueDate')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('shootingDate')}
                  >
                    Job Date {getSortIndicator('shootingDate')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {getSortIndicator('amount')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('paid')}
                  >
                    Paid {getSortIndicator('paid')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Acceptance
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => {
                  const paidAmount = getPaidAmount(invoice);
                  console.log(`[InvoiceList] Rendering invoice ${invoice.id}, jobId: ${invoice.jobId}, shootingDate: ${invoice.shootingDate}, jobDate: ${invoice.jobId ? jobDates[invoice.jobId] : 'no job'}`);
                  console.log(`[InvoiceList] Invoice acceptance check: status=${invoice.status}, invoice_accepted_at=${invoice.invoice_accepted_at}, isAccepted=${isInvoiceAccepted(invoice)}`);
                  console.log(`[InvoiceList] Contract acceptance check: contract_accepted_at=${invoice.contract_accepted_at}, contract_accepted_by=${invoice.contract_accepted_by}, contractStatus=${invoice.contractStatus}, isAccepted=${isContractAccepted(invoice)}`);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium whitespace-nowrap">{invoice.number}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(invoice.date).toLocaleDateString()}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center">
                          <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center">
                          <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          {getJobDateDisplay(invoice)}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">{formatCurrency(invoice.amount, companyCurrency)}</TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">{formatCurrency(paidAmount, companyCurrency)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <AcceptanceStatusDots 
                          isInvoiceAccepted={isInvoiceAccepted(invoice)}
                          isContractAccepted={isContractAccepted(invoice)}
                        />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
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
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
