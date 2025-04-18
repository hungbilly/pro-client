import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoices, deleteInvoice } from '@/lib/storage';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MoreHorizontal, Receipt, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/ui-custom/PageTransition';
import { formatCurrency } from '@/lib/utils';
import CreateInvoiceModal from '@/components/ui-custom/CreateInvoiceModal';
import SearchBox from '@/components/ui-custom/SearchBox';
import ExportDialog from '@/components/ExportDialog';
import { exportDataToFile, formatInvoicesForExport } from '@/utils/exportUtils';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import DateRangeFilter from '@/components/ui-custom/DateRangeFilter';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

import { useCompanyContext } from '@/context/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

const Invoices = () => {
  const { selectedCompany } = useCompanyContext();
  const selectedCompanyId = selectedCompany?.id;
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const queryClient = useQueryClient();
  const [localInvoices, setLocalInvoices] = useState<any[]>([]);
  
  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', selectedCompanyId],
    queryFn: () => getInvoices(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    if (invoices) {
      setLocalInvoices(invoices);
    }
  }, [invoices]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', selectedCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', selectedCompanyId);
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', selectedCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('company_id', selectedCompanyId);
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  const getClientName = (clientId) => {
    const client = clients.find(client => client.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getJobName = (jobId) => {
    if (!jobId) return 'N/A';
    const job = jobs.find(job => job.id === jobId);
    return job ? job.title : 'Unknown Job';
  };

  const handleRowClick = (invoiceId: string) => {
    navigate(`/invoice/${invoiceId}`);
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoice(invoiceToDelete);
      setLocalInvoices(prev => prev.filter(invoice => invoice.id !== invoiceToDelete));
      toast.success("Invoice deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCompanyId] });
      setInvoiceToDelete(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error("Failed to delete invoice");
    }
  };

  const confirmDeleteInvoice = (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation();
    setInvoiceToDelete(invoiceId);
  };

  const handleInvoiceDeleted = (invoiceId: string) => {
    setLocalInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = localInvoices.filter(invoice => {
    const matchesSearch = 
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(invoice.clientId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (getJobName(invoice.jobId) && getJobName(invoice.jobId).toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesDateRange = true;
    if (dateRange?.from) {
      const invoiceDate = new Date(invoice.date);
      
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = invoiceDate >= fromDate && invoiceDate <= toDate;
      } else {
        matchesDateRange = invoiceDate >= fromDate;
      }
    }
    
    return matchesSearch && matchesDateRange;
  });

  const handleExportOpen = () => {
    setIsExportDialogOpen(true);
  };

  const handleExportClose = () => {
    setIsExportDialogOpen(false);
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    const formattedData = formatInvoicesForExport(filteredInvoices, clients, jobs);
    exportDataToFile(formattedData, {
      filename: 'invoices-export',
      format,
      dateRange: dateRange || null
    });
    toast.success(`Invoices exported as ${format.toUpperCase()} successfully`);
  };

  return (
    <PageTransition>
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

      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={handleExportClose}
        onExport={handleExport}
        title="Export Invoices"
        description="Export your filtered invoices data as CSV or Excel file"
        count={filteredInvoices.length}
      />

      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold mb-4 sm:mb-0">Invoices</h1>
          <div className="flex gap-2">
            <Button onClick={openCreateModal}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Create New Invoice</span>
            </Button>
            <Button variant="outline" onClick={handleExportOpen}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        <Card className="backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>All Invoices</CardTitle>
            <div className="flex gap-2">
              <DateRangeFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          </CardHeader>
          <CardContent>
            <SearchBox
              placeholder="Search invoices by number, client name, job, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            
            {isLoading ? (
              <div className="text-center py-4">Loading invoices...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">Failed to load invoices</div>
            ) : localInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Invoices Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  You haven't created any invoices yet. Create your first invoice to get started.
                </p>
                <Button asChild>
                  <Link to="/client/new/invoice/create">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Create Invoice</span>
                  </Link>
                </Button>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No invoices match your search or date filter</p>
                {dateRange?.from && (
                  <Button 
                    variant="ghost" 
                    className="mt-2" 
                    onClick={() => setDateRange(undefined)}
                  >
                    Clear Date Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden md:table-cell">Job</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="hidden md:table-cell">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow 
                        key={invoice.id} 
                        className="cursor-pointer"
                        onClick={() => handleRowClick(invoice.id)}
                      >
                        <TableCell className="font-medium">{invoice.number || '-'}</TableCell>
                        <TableCell>{getClientName(invoice.clientId)}</TableCell>
                        <TableCell className="hidden md:table-cell">{getJobName(invoice.jobId)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {invoice.date ? new Date(invoice.date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(invoice.amount || 0, 'USD')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <CreateInvoiceModal 
          isOpen={isCreateModalOpen} 
          onClose={closeCreateModal} 
        />
      </div>
    </PageTransition>
  );
};

export default Invoices;
