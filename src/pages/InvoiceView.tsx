
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, getInvoiceByViewLink, getClient, getJob, updatePaymentScheduleStatus } from '@/lib/storage';
import { Invoice, Client, Job, PaymentSchedule } from '@/types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Clock, MapPin, User, Building, Phone, Mail, Globe, FileText, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import JobClientSummary from '@/components/invoice/JobClientSummary';
import ContractAcceptance from '@/components/invoice/ContractAcceptance';
import PaymentInfoSection from '@/components/invoice/PaymentInfoSection';
import { formatCurrency } from '@/lib/utils';
import { useCompanyContext } from '@/context/CompanyContext';

const InvoiceView: React.FC = () => {
  const { invoiceId, viewLink } = useParams();
  const navigate = useNavigate();
  const { selectedCompany } = useCompanyContext();
  
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [showContractDetails, setShowContractDetails] = useState(false);
  
  // Determine if this is a client view based on whether we have a viewLink
  const isClientView = Boolean(viewLink);
  
  console.log('[InvoiceView] ===== FETCHING INVOICE =====');
  console.log('[InvoiceView] Identifier:', invoiceId || viewLink);
  console.log('[InvoiceView] Is client view:', isClientView);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setLoading(true);
        let fetchedInvoice: Invoice | null = null;

        if (isClientView && viewLink) {
          console.log('[InvoiceView] Using getInvoiceByViewLink for client view');
          fetchedInvoice = await getInvoiceByViewLink(viewLink);
        } else if (invoiceId) {
          console.log('[InvoiceView] Using getInvoice for UUID');
          fetchedInvoice = await getInvoice(invoiceId);
        }

        console.log('[InvoiceView] ===== INITIAL FETCH RESULT =====');
        console.log('[InvoiceView] Fetched invoice:', {
          id: fetchedInvoice?.id,
          hasPaymentSchedules: !!fetchedInvoice?.paymentSchedules,
          paymentSchedulesCount: fetchedInvoice?.paymentSchedules?.length || 0,
          paymentSchedulesIsArray: Array.isArray(fetchedInvoice?.paymentSchedules),
          paymentSchedules: fetchedInvoice?.paymentSchedules?.map(ps => ({
            id: ps.id,
            dueDate: ps.dueDate,
            percentage: ps.percentage,
            description: ps.description,
            status: ps.status,
            paymentDate: ps.paymentDate
          }))
        });

        if (!fetchedInvoice) {
          console.error('[InvoiceView] No invoice found');
          toast.error('Invoice not found');
          navigate('/');
          return;
        }

        setInvoice(fetchedInvoice);

        // Fetch related data
        if (fetchedInvoice.clientId) {
          const clientData = await getClient(fetchedInvoice.clientId);
          setClient(clientData);
        }

        if (fetchedInvoice.jobId) {
          const jobData = await getJob(fetchedInvoice.jobId);
          setJob(jobData);
        }

        // Fetch company data for client view
        if (isClientView && fetchedInvoice.companyId) {
          const { data: companyData } = await supabase
            .from('company_clientview')
            .select('*')
            .eq('company_id', fetchedInvoice.companyId)
            .single();
          
          if (companyData) {
            setCompany(companyData);
          }
        }

        console.log('[InvoiceView] ===== FINAL INVOICE STATE =====');
        console.log('[InvoiceView] Final payment schedules:', {
          count: fetchedInvoice.paymentSchedules?.length || 0,
          exists: !!fetchedInvoice.paymentSchedules,
          isArray: Array.isArray(fetchedInvoice.paymentSchedules),
          data: fetchedInvoice.paymentSchedules?.map(ps => ({
            id: ps.id,
            dueDate: ps.dueDate,
            percentage: ps.percentage,
            description: ps.description,
            status: ps.status,
            paymentDate: ps.paymentDate
          }))
        });

      } catch (error) {
        console.error('[InvoiceView] Error fetching invoice:', error);
        toast.error('Failed to load invoice');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [invoiceId, viewLink, isClientView, navigate]);

  // Additional debugging for contract acceptance data
  useEffect(() => {
    const checkContractAcceptance = async () => {
      if (!invoice?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('invoice_accepted_by, contract_accepted_at')
          .eq('id', invoice.id)
          .single();
        
        if (!error && data) {
          console.log('[InvoiceView] Direct DB query for invoice_accepted_by:', data.invoice_accepted_by);
          console.log('[InvoiceView] Direct DB query for contract_accepted_at:', data.contract_accepted_at);
        }
      } catch (err) {
        console.error('[InvoiceView] Error checking contract acceptance:', err);
      }
    };

    checkContractAcceptance();
  }, [invoice?.id]);

  const handlePaymentStatusUpdate = async (paymentId: string, newStatus: 'paid' | 'unpaid' | 'write-off', paymentDate?: string) => {
    if (!invoice) return;
    
    setUpdatingPaymentId(paymentId);
    
    try {
      const result = await updatePaymentScheduleStatus(paymentId, newStatus, paymentDate);
      
      if (result && typeof result === 'object') {
        // Update the payment schedule in the invoice
        const updatedPaymentSchedules = invoice.paymentSchedules?.map(schedule => 
          schedule.id === paymentId 
            ? { ...schedule, status: result.status, paymentDate: result.paymentDate }
            : schedule
        ) || [];
        
        setInvoice({ ...invoice, paymentSchedules: updatedPaymentSchedules });
        toast.success(`Payment marked as ${newStatus}`);
      } else {
        toast.error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleContractAccepted = (acceptedBy: string) => {
    if (!invoice) return;
    
    setInvoice({
      ...invoice,
      contractStatus: 'accepted',
      contract_accepted_at: new Date().toISOString(),
      invoice_accepted_by: acceptedBy
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">The invoice you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  console.log('[InvoiceView] ==== CURRENT INVOICE STATE ====');
  console.log('[InvoiceView] Invoice ID:', invoice.id);
  console.log('[InvoiceView] Is client view:', isClientView);
  console.log('[InvoiceView] Payment schedules in state:', {
    count: invoice.paymentSchedules?.length || 0,
    isArray: Array.isArray(invoice.paymentSchedules),
    exists: !!invoice.paymentSchedules,
    data: invoice.paymentSchedules?.map(ps => ({
      id: ps.id,
      dueDate: ps.dueDate,
      percentage: ps.percentage,
      description: ps.description,
      status: ps.status
    }))
  });
  console.log('[InvoiceView] ===============================');

  const formatInvoiceCurrency = (amount: number) => {
    const currency = selectedCompany?.currency || company?.currency || 'USD';
    return formatCurrency(amount, currency);
  };

  // Debug the current invoice data before rendering
  console.log('[InvoiceView] Current invoice data (render):', {
    hasContractTerms: !!invoice.contractTerms,
    contractTermsLength: invoice.contractTerms?.length || 0,
    contractStatus: invoice.contractStatus,
    contractPreview: invoice.contractTerms?.substring(0, 100),
    invoice_accepted_by: invoice.invoice_accepted_by,
    invoice_accepted_by_raw: invoice.invoice_accepted_by,
    contract_accepted_at: invoice.contract_accepted_at
  });

  // Enhanced debug info
  const hasPaymentSchedules = invoice.paymentSchedules && invoice.paymentSchedules.length > 0;
  const paymentSchedulesCount = invoice.paymentSchedules?.length || 0;
  const paymentSchedulesExists = Array.isArray(invoice.paymentSchedules);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Enhanced Debug Info */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
          <h5 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">ENHANCED DEBUG INFO:</h5>
          <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <div>Is client view: {isClientView ? 'YES' : 'NO'}</div>
            <div>hasPaymentSchedules variable: {hasPaymentSchedules ? 'YES' : 'NO'}</div>
            <div>Payment schedules array exists: {paymentSchedulesExists ? 'YES' : 'NO'}</div>
            <div>Payment schedules count: {paymentSchedulesCount}</div>
            <div>Will show PaymentInfoSection: {hasPaymentSchedules ? 'YES' : 'NO'}</div>
            <div>Will show fallback: {!hasPaymentSchedules ? 'YES' : 'NO'}</div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice #{invoice.number}</h1>
            <p className="text-gray-600 mt-1">
              Created on {format(new Date(invoice.date), 'MMMM d, yyyy')}
            </p>
          </div>
          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
            {invoice.status.toUpperCase()}
          </Badge>
        </div>

        {/* Job and Client Summary */}
        <JobClientSummary 
          invoice={invoice}
          client={client}
          job={job}
          company={company}
          isClientView={isClientView}
        />

        {/* Contract Section */}
        {invoice.contractTerms && (
          <ContractAcceptance
            invoice={invoice}
            isClientView={isClientView}
            showContractDetails={showContractDetails}
            onToggleContractDetails={() => setShowContractDetails(!showContractDetails)}
            onContractAccepted={handleContractAccepted}
          />
        )}

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoice.items && invoice.items.length > 0 ? (
                <>
                  {invoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name || item.description}</h4>
                        {item.name && item.description && item.name !== item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          {item.quantity} × {formatInvoiceCurrency(item.rate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatInvoiceCurrency(item.amount)}</p>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center pt-4">
                    <h3 className="text-lg font-semibold text-gray-900">Total Amount</h3>
                    <p className="text-2xl font-bold text-gray-900">{formatInvoiceCurrency(invoice.amount)}</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">No items found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Schedule Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Payment Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPaymentSchedules ? (
              <PaymentInfoSection
                invoice={invoice}
                paymentMethods={company?.payment_methods}
                isClientView={isClientView}
                updatingPaymentId={updatingPaymentId}
                onUpdateStatus={handlePaymentStatusUpdate}
                formatCurrency={formatInvoiceCurrency}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-2">
                  Full payment of {formatInvoiceCurrency(invoice.amount)} due on {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}
                </p>
                {company?.payment_methods && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">Payment Methods</h4>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {company.payment_methods}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InvoiceView;
