import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Invoice, Client } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AreaChart, CalendarDays, ClipboardCheck, Copy, Eye, FileEdit, FileCheck, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { deleteInvoice } from '@/lib/storage';

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

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, client, showCreateButton = true }) => {
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<string | null>(null);
  const queryClient = useQueryClient();
  const { id: jobId } = useParams();
  
  const sortedInvoices = [...invoices].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const draftInvoices = sortedInvoices.filter(invoice => invoice.status === 'draft');
  const activeInvoices = sortedInvoices.filter(invoice => ['sent', 'accepted'].includes(invoice.status));
  const paidInvoices = sortedInvoices.filter(invoice => invoice.status === 'paid');

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

  const renderInvoiceCard = (invoice: Invoice) => (
    <div key={invoice.id} className="group relative">
      <Link 
        to={`/invoice/${invoice.id}`}
        className="block transition-all duration-200 hover:shadow-soft rounded-lg"
      >
        <Card className="overflow-hidden h-full border-transparent hover:border-border transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">{invoice.number}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Created: {new Date(invoice.date).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-1">
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
                {invoice.contractStatus === 'accepted' && (
                  <Badge variant="outline" className={`flex items-center gap-1 ${getContractStatusColor('accepted')}`}>
                    <FileCheck className="h-3 w-3" />
                    Contract Accepted
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pb-12">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-muted-foreground">Due Date:</div>
              <div className="text-sm font-medium flex items-center">
                <CalendarDays className="h-3 w-3 mr-1 text-muted-foreground" />
                {new Date(invoice.dueDate).toLocaleDateString()}
              </div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-muted-foreground">Amount:</div>
              <div className="text-base font-bold">${invoice.amount.toFixed(2)}</div>
            </div>
            
            <div className="absolute bottom-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {invoice.status !== 'draft' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Copy client link"
                  onClick={(e) => copyInvoiceLink(invoice, e)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                asChild
              >
                <Link to={`/invoice/${invoice.id}`}>
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Delete invoice"
                onClick={(e) => confirmDeleteInvoice(e, invoice.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );

  const renderInvoiceSection = (title: string, icon: React.ReactNode, invoices: Invoice[], emptyMessage: string) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      
      {invoices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {invoices.map(renderInvoiceCard)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
      )}
    </div>
  );

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
        <h2 className="text-2xl font-semibold">Invoices</h2>
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AreaChart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Invoices Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {draftInvoices.length > 0 && (
            <>
              {renderInvoiceSection(
                "Draft Invoices", 
                <FileEdit className="h-5 w-5 text-muted-foreground" />, 
                draftInvoices,
                "No draft invoices"
              )}
              <Separator />
            </>
          )}
          
          {renderInvoiceSection(
            "Active Invoices", 
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />, 
            activeInvoices,
            "No active invoices"
          )}
          
          {paidInvoices.length > 0 && (
            <>
              <Separator />
              {renderInvoiceSection(
                "Paid Invoices", 
                <AreaChart className="h-5 w-5 text-muted-foreground" />, 
                paidInvoices,
                "No paid invoices"
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
