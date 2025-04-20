import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
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
import { Invoice, Client, Job, CompanyClientView, PaymentSchedule } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Calendar, FileText, DollarSign, Send, MailCheck, FileCheck, Edit, CalendarDays, Package, Building, User, Phone, Mail, MapPin, Download, Copy, Link as LinkIcon, Bug } from 'lucide-react';
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
import ContractAcceptance from '@/components/invoice/ContractAcceptance';

const InvoiceView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { isAdmin, user } = useAuth();
  const { selectedCompanyId, selectedCompany } = useCompanyContext();
  const { idOrViewLink } = useParams<{ idOrViewLink: string }>();
  const location = useLocation();

  const isClientView = useMemo(() => 
    !location.pathname.includes('/admin') && !user, 
    [location.pathname, user]
  );

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  const [clientViewCompany, setClientViewCompany] = useState<CompanyClientView | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        let fetchedInvoice: Invoice | null = null;
        
        const identifier = idOrViewLink;
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
        
        console.log('[InvoiceView] Fetched invoice with contract terms:', {
          id: fetchedInvoice.id,
          hasContractTerms: !!fetchedInvoice.contractTerms,
          contractTermsLength: fetchedInvoice.contractTerms?.length || 0,
          contractStatus: fetchedInvoice.contractStatus,
          contractTermsPreview: fetchedInvoice.contractTerms?.substring(0, 100),
          invoice_accepted_by: fetchedInvoice.invoice_accepted_by
        });
        
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

        if (fetchedInvoice.jobId) {
          const fetchedJob = await getJob(fetchedInvoice.jobId);
          if (fetchedJob) {
            setJob(fetchedJob);
          }
        }
        
        if (isClientView && fetchedInvoice.companyId) {
          try {
            console.log('[InvoiceView] Client view - fetching company info from company_clientview for:', fetchedInvoice.companyId);
            const { data: companyData, error: companyError } = await supabase
              .from('company_clientview')
              .select('*')
              .eq('company_id', fetchedInvoice.companyId)
              .single();
            
            if (companyError) {
              console.error('[InvoiceView] Error fetching company from clientview:', companyError);
            } else if (companyData) {
              console.log('[InvoiceView] Fetched company data for client view:', companyData);
              setClientViewCompany(companyData as CompanyClientView);
            }
          } catch (err) {
            console.error('[InvoiceView] Failed to fetch company data:', err);
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
  }, [idOrViewLink, location.pathname, selectedCompanyId, isClientView]);

  const handlePaymentStatusUpdate = useCallback(async (paymentId: string, newStatus: 'paid' | 'unpaid' | 'write-off') => {
    if (!invoice || !paymentId) return;
    
    setUpdatingPaymentId(paymentId);
    try {
      const result = await updatePaymentScheduleStatus(paymentId, newStatus, newStatus === 'paid' ? format(new Date(), 'yyyy-MM-dd') : undefined);
      
      if (!result) {
        toast.error('Failed to update payment status');
        return;
      }
      
      const updatedSchedule = result as PaymentSchedule;
      
      if (invoice.paymentSchedules) {
        const updatedSchedules = invoice.paymentSchedules.map(schedule => 
          schedule.id === paymentId ? updatedSchedule : schedule
        );
        
        setInvoice(prev => {
          if (!prev) return prev;
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
      const result = await updatePaymentScheduleStatus(
        paymentId, 
        'paid',
        paymentDate
      );
      
      if (!result) {
        toast.error('Failed to update payment date');
        return;
      }
      
      const updatedSchedule = result as PaymentSchedule;
      
      if (invoice.paymentSchedules) {
        const updatedSchedules = invoice.paymentSchedules.map(schedule => 
          schedule.id === paymentId ? updatedSchedule : schedule
        );
        
        setInvoice(prev => {
          if (!prev) return prev;
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

  const handleCopyInvoiceLink = () => {
    if (!invoice) return;
    
    const baseUrl = window.location.origin;
    
    let cleanViewLink = invoice.viewLink;
    if (cleanViewLink.includes('http') || cleanViewLink.includes('/invoice/')) {
      const parts = cleanViewLink.split('/');
      cleanViewLink = parts[parts.length - 1];
    }
    
    const cleanUrl = `${baseUrl}/invoice/${cleanViewLink}`;
    
    console.log('Copying invoice link:', cleanUrl);
    
    navigator.clipboard.writeText(cleanUrl)
      .then(() => {
        toast.success('Invoice link copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy invoice link:', err);
        toast.error('Failed to copy link to clipboard');
      });
  };

  const handleDownloadInvoice = async () => {
    if (!invoice) return;
    
    if (invoice.pdfUrl) {
      try {
        const link = document.createElement('a');
        link.href = invoice.pdfUrl;
        link.setAttribute('download', `Invoice-${invoice.number}.pdf`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        toast.success('Invoice downloaded successfully');
      } catch (err) {
        console.error('Error during download:', err);
        toast.error('Failed to download invoice');
      }
      return;
    }
    
    try {
      toast.info('Preparing PDF for download...');
      
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id }
      });
      
      if (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate invoice PDF');
        return;
      }
      
      if (data?.pdfUrl) {
        setInvoice(prev => prev ? { ...prev, pdfUrl: data.pdfUrl } : null);
        
        const link = document.createElement('a');
        link.href = data.pdfUrl;
        link.setAttribute('download', `Invoice-${invoice.number}.pdf`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        toast.success('Invoice downloaded successfully');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      toast.error('Failed to download invoice');
    }
  };

  const handleAcceptInvoice = async () => {
    if (!invoice) return;
    
    try {
      await updateInvoiceStatus(invoice.id, 'accepted');
      toast.success('Invoice accepted successfully');
      setInvoice(prev => prev ? { ...prev, status: 'accepted' } : null);
    } catch (err) {
      console.error('Failed to accept invoice:', err);
      toast.error('Error accepting invoice');
    }
  };

  const handleAcceptContract = async (name: string) => {
    if (!invoice) return;
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          contract_status: 'accepted', 
          contract_accepted_at: new Date().toISOString(),
          invoice_accepted_by: name 
        })
        .eq('id', invoice.id);

      if (error) throw error;

      toast.success('Contract terms accepted successfully');
      setInvoice(prev => prev ? { 
        ...prev, 
        contractStatus: 'accepted',
        invoice_accepted_by: name 
      } : null);
    } catch (err) {
      console.error('Failed to accept contract:', err);
      toast.error('Error accepting contract terms');
    }
  };

  const handleDebugPdf = async () => {
    if (!invoice) return;
    
    try {
      toast.info('Generating simplified debug PDF with only company info...');
      
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          invoiceId: invoice.id, 
          debugMode: true 
        }
      });
      
      if (error) {
        console.error('Error generating debug PDF:', error);
        toast.error('Failed to generate debug PDF');
        return;
      }
      
      if (data?.pdfUrl) {
        const debugPdfUrl = data.pdfUrl;
        
        const link = document.createElement('a');
        link.href = debugPdfUrl;
        link.setAttribute('download', `Invoice-${invoice.number}-debug.pdf`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        toast.success('Debug PDF downloaded successfully');
      }
    } catch (err) {
      console.error('Error generating debug PDF:', err);
      toast.error('Failed to generate debug PDF');
    }
  };

  const getDisplayCompany = () => {
    if (isClientView) {
      return clientViewCompany ? {
        id: clientViewCompany.id,
        name: clientViewCompany.name,
        logo_url: clientViewCompany.logo_url,
        email: clientViewCompany.email,
        phone: clientViewCompany.phone,
        address: clientViewCompany.address,
        website: clientViewCompany.website
      } : null;
    } else {
      return selectedCompany;
    }
  };

  const displayCompany = getDisplayCompany();

  useEffect(() => {
    if (invoice) {
      console.log('[InvoiceView] Current invoice data:', {
        hasContractTerms: !!invoice.contractTerms,
        contractTermsLength: invoice.contractTerms?.length || 0,
        contractStatus: invoice.contractStatus,
        contractPreview: invoice.contractTerms?.substring(0, 100),
        invoice_accepted_by: invoice.invoice_accepted_by
      });
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
      <div className="container-fluid px-4 py-8 max-w-[95%] mx-auto">
        {!isClientView && (
          <div className="flex gap-2 mb-4">
            <Button asChild variant="ghost">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            
            {invoice?.jobId && (
              <Button asChild variant="ghost">
                <Link to={`/job/${invoice.jobId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Job
                </Link>
              </Button>
            )}
            
            {invoice?.clientId && (
              <Button asChild variant="ghost">
                <Link to={`/client/${invoice.clientId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Client
                </Link>
              </Button>
            )}
          </div>
        )}
        
        {isClientView && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Invoice #{invoice.number}</h1>
            <p className="text-muted-foreground">
              Please review and accept this invoice and contract terms.
            </p>
          </div>
        )}
        
        <Card className="w-full mx-auto bg-white dark:bg-gray-900 shadow-sm" ref={invoiceRef}>
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
              <div className="flex flex-col justify-between">
                <div className="flex items-start mb-6 h-80">
                  {displayCompany?.logo_url ? (
                    <img 
                      src={displayCompany.logo_url} 
                      alt={`${displayCompany.name} Logo`}
                      className="h-full max-h-80 w-auto object-contain" 
                    />
                  ) : (
                    <div className="h-24 w-24 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-gray-400">
                      <Building className="h-14 w-14" />
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">INVOICE</div>
                  <div className="text-2xl font-bold"># {invoice.number}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">INVOICE ISSUE DATE</div>
                  <div className="text-sm">{new Date(invoice.date).toLocaleDateString()}</div>
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
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">FROM</h4>
                  <div className="font-medium">{displayCompany?.name || 'Company'}</div>
                  {displayCompany?.email && <div className="text-sm">{displayCompany.email}</div>}
                  {displayCompany?.phone && <div className="text-sm">{displayCompany.phone}</div>}
                  {displayCompany?.address && <div className="text-sm">{displayCompany.address}</div>}
                </div>
                
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
                
                <div className="flex items-center space-x-4">
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
                  <Button onClick={handleAcceptInvoice} className="mb-4">
                    <Check className="h-4 w-4 mr-2" />
                    Accept Invoice
                  </Button>
                )}
                
                {invoice.status === 'accepted' && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-800 dark:text-green-400">
                      This invoice has been accepted
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <Package className="h-5 w-5 mr-2" />
                    <h4 className="text-lg font-semibold">Products / Packages</h4>
                  </div>
                  
                  <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="hidden md:flex justify-between mb-3 text-sm font-medium text-muted-foreground border-b pb-2">
                      <div className="flex-1">
                        <div className="mb-1">Package Name</div>
                      </div>
                      <div className="flex-1 pr-4">Description</div>
                      <div className="flex items-center space-x-6 min-w-[260px] justify-end">
                        <div className="text-right w-16">Quantity</div>
                        <div className="text-right w-24">Unit Price</div>
                        <div className="text-right w-24">Amount</div>
                      </div>
                    </div>
                    
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item) => (
                        <div key={item.id} className="mb-4 pb-4 border-b last:mb-0 last:pb-0 last:border-b-0">
                          <div className="md:flex md-justify-between md:items-start">
                            <div className="md:flex-1">
                              <h5 className="font-medium">{item.name || 'Unnamed Package'}</h5>
                            </div>
                            <div className="md:flex-1 md:pr-4">
                              {item.description && (
                                <div className="mt-2 text-sm" dangerouslySetInnerHTML={{ __html: item.description }} />
                              )}
                            </div>
                            <div className="mt-2 md:mt-0 flex flex-col md:flex-row md:items-center md:space-x-6 md:min-w-[260px] md:justify-end">
                              <div className="text-sm text-muted-foreground md:text-right w-16">
                                <span className="md:hidden">Quantity: </span>
                                <span>{item.quantity}</span>
                              </div>
                              <div className="text-sm text-muted-foreground md:text-right w-24">
                                <span className="md:hidden">Unit Price: </span>
                                <span>{formatCurrency(item.rate)}</span>
                              </div>
                              <div className="font-medium md:text-right w-24">
                                <span className="md:hidden">Total: </span>
                                <span>{formatCurrency(item.amount)}</span>
                              </div>
                            </div>
                          </div>
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
                  <ContractAcceptance
                    companyName={displayCompany?.name || 'Company'}
                    onAccept={handleAcceptContract}
                  />
                )}
                  
                {invoice.contractStatus === 'accepted' && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="text-green-800 dark:text-green-400">
                      <p>This contract has been accepted</p>
                      {invoice.invoice_accepted_by && (
                        <p className="text-sm mt-1">Accepted by: {invoice.invoice_accepted_by}</p>
                      )}
                    </div>
                  </div>
                )}
                  
                <div className="flex items-center mb-3">
                  <FileText className="h-5 w-5 mr-2" />
                  <h4 className="text-lg font-semibold">Contract Terms</h4>
                </div>
                <div className="border rounded-md">
                  {invoice.contractTerms ? (
                    <RichTextEditor
                      value={invoice.contractTerms}
                      onChange={() => {}}
                      readOnly={true}
                    />
                  ) : (
                    <div className="p-4 text-muted-foreground">
                      No contract terms provided.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="justify-end gap-2 flex-wrap pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCopyInvoiceLink}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Copy Invoice Link
            </Button>
            <Button
              variant="default"
              onClick={handleDownloadInvoice}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            {!isClientView && isAdmin && (
              <Button
                variant="outline"
                onClick={handleDebugPdf}
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug PDF
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default InvoiceView;
