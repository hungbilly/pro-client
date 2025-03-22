
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { 
  getInvoiceByViewLink, 
  getClient, 
  updateInvoiceStatus, 
  getInvoice, 
  updateContractStatus,
  updatePaymentScheduleStatus,
  getJob
} from '@/lib/storage';
import { Invoice, Client, Job } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Calendar, FileText, DollarSign, Send, MailCheck, FileCheck, Edit, CalendarDays, Package, Building, User, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from '@/components/RichTextEditor';
import PaymentScheduleTable from '@/components/invoice/PaymentScheduleTable';
import isEqual from 'lodash/isEqual';

const InvoiceView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  const { isAdmin } = useAuth();
  const { selectedCompanyId, selectedCompany } = useCompanyContext();
  const { viewLink, id } = useParams<{ viewLink: string, id: string }>();
  const location = useLocation();

  const isClientView = useMemo(() => 
    (location.search.includes('client=true') || !location.search) && !isAdmin, 
    [location.search, isAdmin]
  );

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        let fetchedInvoice: Invoice | null = null;
        
        const identifier = id || viewLink;
        if (!identifier) {
          console.log('[InvoiceView] No identifier provided in URL');
          setError('Invalid URL. Please provide an invoice ID or view link.');
          return;
        }
        
        console.log('[InvoiceView] Fetching invoice with identifier:', identifier);
        
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        if (isUUID) {
          console.log('[InvoiceView] Identifier looks like a UUID, using getInvoice');
          fetchedInvoice = await getInvoice(identifier);
        } else {
          console.log('[InvoiceView] Identifier does not look like a UUID, using getInvoiceByViewLink');
          fetchedInvoice = await getInvoiceByViewLink(identifier);
        }
        
        if (!fetchedInvoice) {
          const urlPath = location.pathname;
          const lastPartOfUrl = urlPath.split('/').pop() || '';
          
          if (lastPartOfUrl && lastPartOfUrl !== identifier) {
            console.log('[InvoiceView] Trying alternative identifier from URL path:', lastPartOfUrl);
            
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
        
        if (selectedCompanyId && fetchedInvoice.companyId !== selectedCompanyId && !isClientView) {
          console.log('[InvoiceView] Invoice company mismatch. Expected:', selectedCompanyId, 'Got:', fetchedInvoice.companyId);
          toast.error("This invoice belongs to a different company");
          setError('This invoice belongs to a different company.');
          return;
        }
        
        setInvoice(fetchedInvoice);
        
        // Fetch client data
        if (fetchedInvoice.clientId) {
          const fetchedClient = await getClient(fetchedInvoice.clientId);
          if (!fetchedClient) {
            console.log('[InvoiceView] No client found for clientId:', fetchedInvoice.clientId);
            setError('Client information not found.');
            return;
          }
          
          setClient(fetchedClient);
        }

        // Fetch job data if it exists
        if (fetchedInvoice.jobId) {
          const fetchedJob = await getJob(fetchedInvoice.jobId);
          if (fetchedJob) {
            setJob(fetchedJob);
          }
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

  const handlePaymentStatusUpdate = useCallback(async (paymentId: string, newStatus: 'paid' | 'unpaid' | 'write-off') => {
    if (!invoice || !paymentId) return;
    
    setUpdatingPaymentId(paymentId);
    try {
      let updatedSchedule;
      if (newStatus === 'paid') {
        const today = new Date();
        const formattedDate = format(today, 'yyyy-MM-dd');
        updatedSchedule = await updatePaymentScheduleStatus(paymentId, newStatus, formattedDate);
      } else {
        updatedSchedule = await updatePaymentScheduleStatus(paymentId, newStatus);
      }
      
      if (!updatedSchedule) {
        toast.error('Failed to update payment status');
        return;
      }
      
      if (invoice.paymentSchedules) {
        const updatedSchedules = invoice.paymentSchedules.map(schedule => 
          schedule.id === paymentId ? updatedSchedule : schedule
        );
        
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
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
      toast.error('Error updating payment status');
    } finally {
      setUpdatingPaymentId(null);
    }
  }, [invoice]);

  const handlePaymentDateUpdate = useCallback(async (paymentId: string, paymentDate: string) => {
    if (!invoice || !paymentId) return;
    
    setUpdatingPaymentId(paymentId);
    try {
      const updatedSchedule = await updatePaymentScheduleStatus(
        paymentId, 
        'paid',
        paymentDate
      );
      
      if (!updatedSchedule) {
        toast.error('Failed to update payment date');
        return;
      }
      
      if (invoice.paymentSchedules) {
        const updatedSchedules = invoice.paymentSchedules.map(schedule => 
          schedule.id === paymentId ? updatedSchedule : schedule
        );
        
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
      }
    } catch (err) {
      console.error('Failed to update payment date:', err);
      toast.error('Error updating payment date');
    } finally {
      setUpdatingPaymentId(null);
    }
  }, [invoice]);

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
        
        <Card className="max-w-4xl mx-auto bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-0">
            {!isClientView && (
              <div className="flex justify-end mb-2">
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
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              {/* Left Column: Logo and Invoice # */}
              <div className="flex flex-col justify-between">
                <div className="flex items-center mb-4">
                  {invoice.companyId && selectedCompany?.logo_url ? (
                    <img 
                      src={selectedCompany.logo_url} 
                      alt={`${selectedCompany.name} Logo`}
                      className="h-14 w-auto object-contain mr-3" 
                    />
                  ) : (
                    <div className="h-14 w-14 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-gray-400">
                      <Building className="h-8 w-8" />
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">INVOICE</div>
                  <div className="text-2xl font-bold"># {invoice.number}</div>
                  <div className="mt-1 flex items-center">
                    <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                      {invoice.status.toUpperCase()}
                    </Badge>
                    {invoice.contractStatus === 'accepted' && (
                      <Badge variant="outline" className={`ml-2 flex items-center gap-1 ${contractStatusColor}`}>
                        <FileCheck className="h-3 w-3" />
                        Contract Accepted
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right Column: From, To, Dates */}
              <div className="space-y-4">
                {/* From: Company Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">FROM</h4>
                  <div className="font-medium">{selectedCompany?.name}</div>
                  {selectedCompany?.email && <div className="text-sm">{selectedCompany.email}</div>}
                  {selectedCompany?.phone && <div className="text-sm">{selectedCompany.phone}</div>}
                  {selectedCompany?.address && <div className="text-sm">{selectedCompany.address}</div>}
                </div>
                
                {/* To: Client and Job Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">INVOICE FOR</h4>
                  {job && <div className="font-medium">{job.title}</div>}
                  <div className="text-sm font-medium mt-1">Client: {client.name}</div>
                  <div className="text-sm grid grid-cols-1 gap-1 mt-1">
                    {client.email && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Mail className="h-3 w-3 mr-1" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Phone className="h-3 w-3 mr-1" />
                        {client.phone}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <MapPin className="h-3 w-3 mr-1" />
                        {client.address}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Date Information */}
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">DATE</div>
                    <div className="text-sm">{new Date(invoice.date).toLocaleDateString()}</div>
                  </div>
                  {job?.date && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">JOB DATE</div>
                      <div className="text-sm">{job.date}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Separator className="mt-6" />
          </CardHeader>
          
          <CardContent className="pt-6">
            <Tabs defaultValue="invoice" className="w-full">
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
              
              <TabsContent value="invoice" className="mt-6">
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
                  
                  <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900/50">
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
                      onUpdatePaymentDate={handlePaymentDateUpdate}
                    />
                  ) : (
                    <div className="text-muted-foreground border rounded-md p-4 bg-gray-50 dark:bg-gray-900/50">
                      Full payment of {formatCurrency(invoice.amount)} due on {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="contract" className="mt-6">
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
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="justify-end gap-2 flex-wrap pt-4 border-t">
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
    </PageTransition>
  );
};

export default InvoiceView;
