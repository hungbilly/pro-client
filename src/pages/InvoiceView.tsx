
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { 
  getInvoiceByViewLink, 
  getClient, 
  updateInvoiceStatus, 
  getInvoice, 
  updateContractStatus,
  updatePaymentScheduleStatus
} from '@/lib/storage';
import { Invoice, Client } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Calendar, FileText, DollarSign, Send, Camera, MailCheck, FileCheck, Edit, CalendarDays, Package } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from '@/components/RichTextEditor';
import PaymentScheduleTable from '@/components/invoice/PaymentScheduleTable';
import PaymentDateDialog from '@/components/invoice/PaymentDateDialog';
import isEqual from 'lodash/isEqual';

const InvoiceView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [showPaymentDateDialog, setShowPaymentDateDialog] = useState(false);
  const [paymentIdToUpdate, setPaymentIdToUpdate] = useState<string | null>(null);

  const { isAdmin } = useAuth();
  const { selectedCompanyId } = useCompanyContext();
  const { viewLink, id } = useParams<{ viewLink: string, id: string }>();
  const location = useLocation();

  // Memoize frequently used values to prevent render loops
  const isClientView = useMemo(() => 
    (location.search.includes('client=true') || !location.search) && !isAdmin, 
    [location.search, isAdmin]
  );

  // Format currency with memoization to prevent unnecessary re-renders
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Fetch invoice and client data
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        let fetchedInvoice: Invoice | null = null;
        
        // Combine id and viewLink, preferring id if available
        const identifier = id || viewLink;
        if (!identifier) {
          console.log('[InvoiceView] No identifier provided in URL');
          setError('Invalid URL. Please provide an invoice ID or view link.');
          return;
        }
        
        console.log('[InvoiceView] Fetching invoice with identifier:', identifier);
        
        // Check if the identifier looks like a UUID (likely an invoice ID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        if (isUUID) {
          console.log('[InvoiceView] Identifier looks like a UUID, using getInvoice');
          fetchedInvoice = await getInvoice(identifier);
        } else {
          console.log('[InvoiceView] Identifier does not look like a UUID, using getInvoiceByViewLink');
          fetchedInvoice = await getInvoiceByViewLink(identifier);
        }
        
        if (!fetchedInvoice) {
          // Try alternative approach if no invoice is found
          const urlPath = location.pathname;
          const lastPartOfUrl = urlPath.split('/').pop() || '';
          
          if (lastPartOfUrl && lastPartOfUrl !== identifier) {
            console.log('[InvoiceView] Trying alternative identifier from URL path:', lastPartOfUrl);
            
            // Check if this alternative identifier is a UUID
            const isLastPartUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPartOfUrl);
            
            if (isLastPartUUID) {
              fetchedInvoice = await getInvoice(lastPartOfUrl);
            } else {
              fetchedInvoice = await getInvoiceByViewLink(lastPartOfUrl);
            }
          }
        }
        
        if (!fetchedInvoice) {
          console.log('[InvoiceView] No invoice found for identifier:', identifier);
          setError('Invoice not found. Please check the URL or contact support.');
          return;
        }
        
        // Check if the invoice belongs to the selected company
        if (selectedCompanyId && fetchedInvoice.companyId !== selectedCompanyId && !isClientView) {
          console.log('[InvoiceView] Invoice company mismatch. Expected:', selectedCompanyId, 'Got:', fetchedInvoice.companyId);
          toast.error("This invoice belongs to a different company");
          setError('This invoice belongs to a different company.');
          return;
        }
        
        setInvoice(fetchedInvoice);
        
        if (fetchedInvoice.clientId) {
          const fetchedClient = await getClient(fetchedInvoice.clientId);
          if (!fetchedClient) {
            console.log('[InvoiceView] No client found for clientId:', fetchedInvoice.clientId);
            setError('Client information not found.');
            return;
          }
          
          setClient(fetchedClient);
        }
      } catch (err) {
        console.error('[InvoiceView] Failed to load invoice:', err);
        setError('Failed to load invoice. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoice();
  }, [id, viewLink, location.pathname, selectedCompanyId, isClientView]);

  // Handle payment status update
  const handlePaymentStatusUpdate = useCallback(async (paymentId: string, newStatus: 'paid' | 'unpaid' | 'write-off') => {
    if (!invoice || !paymentId) return;
    
    if (newStatus === 'paid') {
      setPaymentIdToUpdate(paymentId);
      setPaymentDate(new Date());
      setShowPaymentDateDialog(true);
      return;
    }
    
    setUpdatingPaymentId(paymentId);
    try {
      const updatedSchedule = await updatePaymentScheduleStatus(paymentId, newStatus);
      
      if (!updatedSchedule) {
        toast.error('Failed to update payment status');
        return;
      }
      
      if (invoice.paymentSchedules) {
        const updatedSchedules = invoice.paymentSchedules.map(schedule => 
          schedule.id === paymentId ? updatedSchedule : schedule
        );
        
        // Use functional update with deep equality check
        setInvoice(prev => {
          if (!prev) return prev;
          if (isEqual(prev.paymentSchedules, updatedSchedules)) {
            return prev;
          }
          return {
            ...prev,
            paymentSchedules: updatedSchedules
          };
        });
        
        toast.success(`Payment marked as ${newStatus}`);
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
      toast.error('Error updating payment status');
    } finally {
      setUpdatingPaymentId(null);
    }
  }, [invoice]);

  // Handle confirm payment date
  const handleConfirmPaymentDate = useCallback(async () => {
    if (!paymentIdToUpdate || !paymentDate || !invoice) {
      toast.error('Please select a payment date');
      return;
    }
    
    setUpdatingPaymentId(paymentIdToUpdate);
    try {
      const updatedSchedule = await updatePaymentScheduleStatus(
        paymentIdToUpdate, 
        'paid', 
        format(paymentDate, 'yyyy-MM-dd')
      );
      
      if (!updatedSchedule) {
        toast.error('Failed to update payment status');
        return;
      }
      
      if (invoice.paymentSchedules) {
        const updatedSchedules = invoice.paymentSchedules.map(schedule => 
          schedule.id === paymentIdToUpdate ? updatedSchedule : schedule
        );
        
        // Use functional update with deep equality check
        setInvoice(prev => {
          if (!prev) return prev;
          if (isEqual(prev.paymentSchedules, updatedSchedules)) {
            return prev;
          }
          return {
            ...prev,
            paymentSchedules: updatedSchedules
          };
        });
        
        toast.success('Payment marked as paid');
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
      toast.error('Error updating payment status');
    } finally {
      setUpdatingPaymentId(null);
      setPaymentIdToUpdate(null);
      setShowPaymentDateDialog(false);
      setPaymentDate(undefined);
    }
  }, [invoice, paymentIdToUpdate, paymentDate]);

  // Handle cancel payment date
  const handleCancelPaymentDate = useCallback(() => {
    setShowPaymentDateDialog(false);
    setPaymentDate(undefined);
    setPaymentIdToUpdate(null);
  }, []);

  // Handle payment date select
  const handlePaymentDateSelect = useCallback((date: Date | undefined) => {
    setPaymentDate(date);
  }, []);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          Loading invoice...
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          Error: {error}
        </div>
      </PageTransition>
    );
  }

  if (!invoice || !client) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          Invoice or client not found.
        </div>
      </PageTransition>
    );
  }

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  const contractStatusColor = invoice.contractStatus === 'accepted' 
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';

  return (
    <PageTransition>
      <div className="container py-8">
        {!isClientView && (
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        )}
        
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>Invoice: {invoice.number}</span>
              <div className="flex flex-col gap-1">
                <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                  {invoice.status.toUpperCase()}
                </Badge>
                {invoice.contractStatus === 'accepted' && (
                  <Badge variant="outline" className={`flex items-center gap-1 ${contractStatusColor}`}>
                    <FileCheck className="h-3 w-3" />
                    Contract Accepted
                  </Badge>
                )}
              </div>
            </CardTitle>
            <CardDescription className="flex justify-between items-center">
              <span>View invoice details and contract terms.</span>
              {!isClientView && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (invoice.jobId) {
                      window.location.href = `/job/${invoice.jobId}/invoice/${invoice.id}/edit`;
                    } else {
                      window.location.href = `/client/${client.id}/invoice/${invoice.id}/edit`;
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit Invoice
                </Button>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold mb-2">Client Information</h4>
                <p>
                  <strong>Name:</strong> {client.name}
                </p>
                <p>
                  <strong>Email:</strong> {client.email}
                </p>
                <p>
                  <strong>Phone:</strong> {client.phone}
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Invoice Details</h4>
                <p>
                  <strong>Job Date:</strong> {new Date(invoice.date).toLocaleDateString()}
                </p>
                {invoice.shootingDate && (
                  <p className="flex items-center">
                    <strong className="mr-1">Shooting Date:</strong>
                    <Camera className="h-4 w-4 mr-1" />
                    {new Date(invoice.shootingDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <Tabs defaultValue="invoice" className="w-full mt-4">
              <TabsList className="w-full">
                <TabsTrigger value="invoice" className="flex-1">
                  Invoice Details
                  {invoice.status === 'accepted' && (
                    <span className="ml-2">
                      <FileCheck className="h-3 w-3 inline text-green-600" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="contract" className="flex-1">
                  Contract Terms
                  {invoice.contractStatus === 'accepted' && (
                    <span className="ml-2">
                      <FileCheck className="h-3 w-3 inline text-green-600" />
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="invoice" className="mt-4">
                {isClientView && ['draft', 'sent'].includes(invoice.status) && (
                  <Button onClick={() => updateInvoiceStatus(invoice.id, 'accepted')} className="mb-4">
                    <Check className="h-4 w-4 mr-2" />
                    Accept Invoice
                  </Button>
                )}
                
                {invoice.status === 'accepted' && !isClientView && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-800 dark:text-green-400">
                      This invoice has been accepted by the client
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <Package className="h-5 w-5 mr-2" />
                    <h4 className="text-lg font-semibold">Products / Packages</h4>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item) => (
                        <div key={item.id} className="mb-4 pb-4 border-b last:mb-0 last:pb-0 last:border-b-0">
                          <div className="flex justify-between">
                            <h5 className="font-medium">{item.description ? item.description.split('<')[0] : 'Product'}</h5>
                            <span className="font-medium">{formatCurrency(item.amount)}</span>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {item.quantity} x {formatCurrency(item.rate)}
                          </div>
                          {item.description && (
                            <div className="mt-2 text-sm" dangerouslySetInnerHTML={{ __html: item.description }} />
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No items in this invoice.</p>
                    )}
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-2">Notes</h4>
                  <div className="border rounded-md">
                    <RichTextEditor
                      value={invoice.notes || 'No notes provided.'}
                      onChange={() => {}}
                      readOnly={true}
                    />
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="mt-6">
                  <div className="flex items-center mb-3">
                    <CalendarDays className="h-5 w-5 mr-2" />
                    <h4 className="text-lg font-semibold">Payment Schedule</h4>
                  </div>
                  
                  {Array.isArray(invoice.paymentSchedules) && invoice.paymentSchedules.length > 0 ? (
                    <PaymentScheduleTable
                      paymentSchedules={invoice.paymentSchedules}
                      amount={invoice.amount}
                      isClientView={isClientView}
                      updatingPaymentId={updatingPaymentId}
                      onUpdateStatus={handlePaymentStatusUpdate}
                      formatCurrency={formatCurrency}
                    />
                  ) : (
                    <div className="text-muted-foreground border rounded-md p-4">
                      Full payment of {formatCurrency(invoice.amount)} due on {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="contract" className="mt-4">
                <div className="mb-4">
                  {isClientView && invoice.contractStatus !== 'accepted' && (
                    <Button onClick={() => updateContractStatus(invoice.id, 'accepted')} className="mb-4">
                      <Check className="h-4 w-4 mr-2" />
                      Accept Contract Terms
                    </Button>
                  )}
                  
                  {invoice.contractStatus === 'accepted' && !isClientView && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-green-800 dark:text-green-400">
                        This contract has been accepted by the client
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center mb-3">
                    <FileText className="h-5 w-5 mr-2" />
                    <h4 className="text-lg font-semibold">Contract Terms</h4>
                  </div>
                  <div className="border rounded-md">
                    <RichTextEditor
                      value={invoice.contractTerms || 'No contract terms provided.'}
                      onChange={() => {}}
                      readOnly={true}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="justify-end gap-2 flex-wrap">
            {!isClientView && (
              <Button
                variant="default"
                disabled={!client?.email}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <PaymentDateDialog
        open={showPaymentDateDialog}
        onOpenChange={setShowPaymentDateDialog}
        paymentDate={paymentDate}
        onDateSelect={handlePaymentDateSelect}
        onConfirm={handleConfirmPaymentDate}
        onCancel={handleCancelPaymentDate}
        isUpdating={updatingPaymentId !== null}
      />
    </PageTransition>
  );
};

export default InvoiceView;
