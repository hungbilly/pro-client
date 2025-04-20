import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Client, Company, Invoice, PaymentSchedule, PaymentStatus } from '@/types';
import { getInvoiceByViewLink, getClient, getCompany, updateContractStatus, updatePaymentScheduleStatus } from '@/lib/storage';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Copy, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import PaymentScheduleTable from '@/components/invoice/PaymentScheduleTable';

const InvoiceView = () => {
  const { viewLink } = useParams<{ viewLink: string }>();
  const queryClient = useQueryClient();

  const [isAccepting, setIsAccepting] = React.useState(false);
  const [showContractAcceptDialog, setShowContractAcceptDialog] = React.useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = React.useState<string | null>(null);

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', viewLink],
    queryFn: async () => {
      if (!viewLink) return null;
      return await getInvoiceByViewLink(viewLink);
    },
    enabled: !!viewLink,
  });

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', invoice?.clientId],
    queryFn: async () => {
      if (!invoice?.clientId) return null;
      return await getClient(invoice.clientId);
    },
    enabled: !!invoice?.clientId,
  });

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', invoice?.companyId],
    queryFn: async () => {
      if (!invoice?.companyId) return null;
      return await getCompany(invoice.companyId);
    },
    enabled: !!invoice?.companyId,
  });

  const handleAcceptContract = async () => {
    if (!invoice?.id) return;
    
    try {
      setIsAccepting(true);
      await updateContractStatus(invoice.id, 'accepted');
      toast.success("Contract accepted!");
      queryClient.invalidateQueries({ queryKey: ['invoice', viewLink] });
      setShowContractAcceptDialog(false);
    } catch (error) {
      console.error("Failed to accept contract:", error);
      toast.error("Failed to accept contract");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: PaymentStatus, paymentDate?: string) => {
    try {
      setUpdatingPaymentId(paymentId);
      await updatePaymentScheduleStatus(paymentId, newStatus, paymentDate);
      
      queryClient.invalidateQueries({ queryKey: ['invoice', viewLink] });
      toast.success(`Payment status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    } finally {
      setUpdatingPaymentId(null);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: company?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (invoiceLoading || clientLoading || companyLoading) {
    return <div className="text-center py-8">Loading invoice...</div>;
  }

  if (!invoice || !client || !company) {
    return <div className="text-center py-8">Invoice not found.</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Invoice #{invoice.number}</CardTitle>
          <CardDescription>
            View invoice details and accept contract.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Client Information</h3>
            <p>Name: {client.name}</p>
            <p>Email: {client.email}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Company Information</h3>
            <p>Name: {company.name}</p>
            <p>Email: {company.email}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Invoice Details</h3>
            <p>Date: {format(new Date(invoice.date), 'PPP')}</p>
            <p>Amount: {formatCurrency(invoice.amount)}</p>
            <p>Status: {invoice.status}</p>
            {invoice.contractStatus === 'pending' && (
              <Badge variant="secondary">Contract Pending</Badge>
            )}
            {invoice.contractStatus === 'accepted' && (
              <Badge variant="outline">Contract Accepted <CheckCircle className="h-4 w-4 ml-1" /></Badge>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold">Payment Schedule</h3>
            {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 ? (
              <PaymentScheduleTable
                paymentSchedules={invoice.paymentSchedules}
                amount={invoice.amount}
                isClientView={true}
                updatingPaymentId={updatingPaymentId}
                onUpdateStatus={handleUpdatePaymentStatus}
                formatCurrency={formatCurrency}
              />
            ) : (
              <Alert variant="info">
                <AlertCircle className="h-4 w-4" />
                No payment schedules found.
              </Alert>
            )}
          </div>

          {invoice.contractTerms && (
            <div>
              <h3 className="text-lg font-semibold">Contract Terms</h3>
              <div dangerouslySetInnerHTML={{ __html: invoice.contractTerms }} />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          {invoice.contractStatus === 'pending' && (
            <>
              <Button onClick={() => setShowContractAcceptDialog(true)} disabled={isAccepting}>
                {isAccepting ? (
                  <>
                    Accepting...
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  </>
                ) : (
                  "Accept Contract"
                )}
              </Button>

              <AlertDialog open={showContractAcceptDialog} onOpenChange={setShowContractAcceptDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Accept Contract</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to accept this contract?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAcceptContract} disabled={isAccepting}>
                      {isAccepting ? (
                        <>
                          Accepting...
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        "Accept"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default InvoiceView;
