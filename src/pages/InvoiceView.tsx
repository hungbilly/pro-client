import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  getInvoiceByViewLink, 
  getClient, 
  updateInvoiceStatus, 
  getInvoice, 
  updateContractStatus,
  updatePaymentScheduleStatus,
  getJob
} from '@/lib/storage';
import { Invoice, Client, Job, CompanyClientView, PaymentSchedule, ContractStatus } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Calendar, FileText, DollarSign, Send, MailCheck, FileCheck, Edit, CalendarDays, Package, Building, User, Phone, Mail, MapPin, Download, Copy, Link as LinkIcon, Bug, Share2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from '@/components/RichTextEditor';
import PaymentInfoSection from '@/components/invoice/PaymentInfoSection';
import isEqual from 'lodash/isEqual';
import ContractAcceptance from '@/components/invoice/ContractAcceptance';
import { formatCurrency as utilFormatCurrency } from "@/lib/utils";
import TopNavbar from '@/components/TopNavbar';
import InvoiceShareDialog from '@/components/invoice/InvoiceShareDialog';

const InvoiceView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [clientViewCompany, setClientViewCompany] = useState<CompanyClientView | null>(null);

  const { isAdmin, user } = useAuth();
  const { selectedCompanyId, selectedCompany } = useCompanyContext();
  const { idOrViewLink } = useParams<{ idOrViewLink: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const isClientView = useMemo(() => 
    !location.pathname.includes('/admin') && !user, 
    [location.pathname, user]
  );
  
  const isEditView = false;

  const companyCurrency =
    (isClientView
      ? clientViewCompany?.currency
      : selectedCompany?.currency) || "USD";

  const formatCurrency = useCallback(
    (amount: number) => utilFormatCurrency(amount, companyCurrency),
    [companyCurrency]
  );

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
        
        if (fetchedInvoice.id) {
          try {
            const { data: rawInvoice, error: rawError } = await supabase
              .from('invoices')
              .select('invoice_accepted_by, contract_accepted_at')
              .eq('id', fetchedInvoice.id)
              .single();
              
            if (rawInvoice) {
              console.log('[InvoiceView] Direct DB query for invoice_accepted_by:', rawInvoice.invoice_accepted_by);
              console.log('[InvoiceView] Direct DB query for contract_accepted_at:', rawInvoice.contract_accepted_at);
              
              console.log('[InvoiceView] DETAILED DEBUG - Before update:');
              console.log('[InvoiceView] fetchedInvoice.invoice_accepted_by =', 
                fetchedInvoice.invoice_accepted_by, 
                'type:', typeof fetchedInvoice.invoice_accepted_by);
              console.log('[InvoiceView] fetchedInvoice.contract_accepted_at =', 
                fetchedInvoice.contract_accepted_at,
                'type:', typeof fetchedInvoice.contract_accepted_at);
              console.log('[InvoiceView] rawInvoice.invoice_accepted_by =', 
                rawInvoice.invoice_accepted_by,
                'type:', typeof rawInvoice.invoice_accepted_by);
              console.log('[InvoiceView] rawInvoice.contract_accepted_at =', 
                rawInvoice.contract_accepted_at,
                'type:', typeof rawInvoice.contract_accepted_at);
              
              if (rawInvoice.invoice_accepted_by && !fetchedInvoice.invoice_accepted_by) {
                console.log('[InvoiceView] Updating fetchedInvoice.invoice_accepted_by with DB value');
                fetchedInvoice.invoice_accepted_by = rawInvoice.invoice_accepted_by;
              }
              if (rawInvoice.contract_accepted_at && !fetchedInvoice.contract_accepted_at) {
                console.log('[InvoiceView] Updating fetchedInvoice.contract_accepted_at with DB value');
                fetchedInvoice.contract_accepted_at = rawInvoice.contract_accepted_at;
              }
              
              console.log('[InvoiceView] DETAILED DEBUG - After update:');
              console.log('[InvoiceView] fetchedInvoice.invoice_accepted_by =', 
                fetchedInvoice.invoice_accepted_by,
                'type:', typeof fetchedInvoice.invoice_accepted_by);
              console.log('[InvoiceView] fetchedInvoice.contract_accepted_at =', 
                fetchedInvoice.contract_accepted_at,
                'type:', typeof fetchedInvoice.contract_accepted_at);
            }
          } catch (err) {
            console.error('[InvoiceView] Error fetching raw invoice data:', err);
          }
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
    
    try {
      toast.info('Preparing PDF for download...');
      
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank');
        toast.success('Invoice downloaded successfully');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          invoiceId: invoice.id,
          forceRegenerate: true
        }
      });
      
      if (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate invoice PDF');
        return;
      }
      
      if (data?.pdfUrl) {
        setInvoice(prev => prev ? { ...prev, pdfUrl: data.pdfUrl } : null);
        
        window.open(data.pdfUrl, '_blank');
        toast.success('Invoice downloaded successfully');
      } else {
        throw new Error('No PDF URL returned');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      toast.error('Failed to download invoice', {
        description: 'Please try again later or contact support.'
      });
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
      console.log('[InvoiceView] Accepting contract with name:', name);
      
      const updates = {
        contract_status: 'accepted' as ContractStatus,
        contract_accepted_at: new Date().toISOString(),
        invoice_accepted_by: name,
      };

      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', invoice.id)
        .select('invoice_accepted_by, contract_accepted_at');

      if (error) {
        console.error('[InvoiceView] Error updating contract:', error);
        throw error;
      }

      console.log('[InvoiceView] Contract acceptance response:', data);

      toast.success('Contract terms accepted successfully');
      
      setInvoice(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          contractStatus: 'accepted' as ContractStatus,
          invoice_accepted_by: name,
          contract_accepted_at: new Date().toISOString()
        };
      });
    } catch (err) {
      console.error('[InvoiceView] Failed to accept contract:', err);
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
        website: clientViewCompany.website,
        payment_methods: clientViewCompany.payment_methods
      } : null;
    } else {
      return selectedCompany;
    }
  };

  const displayCompany = getDisplayCompany();

  useEffect(() => {
    if (invoice) {
      console.log('[InvoiceView] Current invoice data (render):', {
        hasContractTerms: !!invoice.contractTerms,
        contractTermsLength: invoice.contractTerms?.length || 0,
        contractStatus: invoice.contractStatus,
        contractPreview: invoice.contractTerms?.substring(0, 100),
        invoice_accepted_by: invoice.invoice_accepted_by,
        invoice_accepted_by_raw: typeof invoice.invoice_accepted_by === 'object' ? 
          JSON.stringify(invoice.invoice_accepted_by) : invoice.invoice_accepted_by,
        contract_accepted_at: invoice.contract_accepted_at
      });
    }
  }, [invoice]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoice...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-red-900 dark:to-orange-900">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">Error: {error}</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!invoice || !client) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 dark:from-gray-900 dark:via-slate-900 dark:to-stone-900">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">Invoice or client not found.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  const contractStatusColor = invoice?.contractStatus === 'accepted' 
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';

  return (
    <>
      {!isClientView && user && <TopNavbar />}
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
          <div className="container-fluid px-4 py-8 max-w-[95%] mx-auto">
            {!isClientView && (
              <div className="flex gap-2 mb-4">
                <Button asChild variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20">
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                
                {invoice?.jobId && (
                  <Button asChild variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/20">
                    <Link to={`/job/${invoice.jobId}`}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Job
                    </Link>
                  </Button>
                )}
                
                {invoice?.clientId && (
                  <Button asChild variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20">
                    <Link to={`/client/${invoice.clientId}`}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Client
                    </Link>
                  </Button>
                )}
              </div>
            )}
            
            {isClientView && (
              <div className="text-center mb-6 p-6 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <h1 className="text-2xl font-bold mb-2 text-blue-900 dark:text-blue-100">Invoice #{invoice.number}</h1>
                <p className="text-blue-700 dark:text-blue-300">
                  Please review and accept this invoice and contract terms.
                </p>
              </div>
            )}
            
            <Card className="w-full mx-auto bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 shadow-lg border-0 ring-1 ring-gray-200/50 dark:ring-gray-700/50" ref={invoiceRef}>
              <CardHeader className="pb-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5">
                {!isClientView && (
                  <div className="flex justify-end gap-2 mb-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShareDialogOpen(true)}
                      className="flex items-center gap-1 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      <Share2 className="h-3 w-3" />
                      Share Invoice
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (!invoice.id) {
                          toast.error("Cannot edit invoice: Invoice ID is missing");
                          return;
                        }
                        navigate(`/invoice/${invoice.id}/edit`);
                      }}
                      className="flex items-center gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                    >
                      <Edit className="h-3 w-3" />
                      Edit Invoice
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                  <div className="flex flex-col justify-between">
                    <div className="flex items-start mb-6 h-80 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                      {displayCompany?.logo_url ? (
                        <img 
                          src={displayCompany.logo_url} 
                          alt={`${displayCompany.name} Logo`}
                          className="h-full max-h-80 w-auto object-contain" 
                        />
                      ) : (
                        <div className="h-24 w-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center">
                          <Building className="h-14 w-14 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg">
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">INVOICE</div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100"># {invoice.number}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">INVOICE ISSUE DATE</div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">{new Date(invoice.date).toLocaleDateString()}</div>
                      <div className="mt-2 flex items-center">
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
                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
                      <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">FROM</h4>
                      <div className="font-medium text-green-900 dark:text-green-100">{displayCompany?.name || 'Company'}</div>
                      {displayCompany?.email && <div className="text-sm text-green-700 dark:text-green-300">{displayCompany.email}</div>}
                      {displayCompany?.phone && <div className="text-sm text-green-700 dark:text-green-300">{displayCompany.phone}</div>}
                      {displayCompany?.address && <div className="text-sm text-green-700 dark:text-green-300">{displayCompany.address}</div>}
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                      <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">INVOICE FOR</h4>
                      {job && <div className="font-medium text-purple-900 dark:text-purple-100">{job.title}</div>}
                      <div className="text-sm font-medium mt-1 text-purple-800 dark:text-purple-200">Client: {client.name}</div>
                      <div className="text-sm grid grid-cols-1 gap-1 mt-2">
                        {client.email && (
                          <div className="flex items-center text-purple-600 dark:text-purple-400">
                            <Mail className="h-3 w-3 mr-1" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center text-purple-600 dark:text-purple-400">
                            <Phone className="h-3 w-3 mr-1" />
                            {client.phone}
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center text-purple-600 dark:text-purple-400">
                            <MapPin className="h-3 w-3 mr-1" />
                            {client.address}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {job?.date && (
                      <div className="flex items-center space-x-4 p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg">
                        <div>
                          <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">JOB DATE</div>
                          <div className="text-sm text-amber-800 dark:text-amber-200">{job.date}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Separator className="mt-6 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800" />
              </CardHeader>
              
              <CardContent className="pt-6">
                <Tabs defaultValue="invoice" className="w-full">
                  <TabsList className="w-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                    <TabsTrigger value="invoice" className="flex-1 relative data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <span>Invoice Details</span>
                        {invoice.status === 'accepted' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : null}
                      </div>
                      {isClientView && ['draft', 'sent'].includes(invoice.status) && (
                        <div className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                          1
                        </div>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="contract" className="flex-1 relative data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <span>Contract Terms</span>
                        {invoice.contractStatus === 'accepted' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : null}
                      </div>
                      {isClientView && invoice.contractTerms && invoice.contractStatus === 'pending' && (
                        <div className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                          1
                        </div>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="invoice" className="mt-6">
                    {isClientView && ['draft', 'sent'].includes(invoice.status) && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          <span className="font-medium text-orange-800 dark:text-orange-300">
                            Action Required: Please accept this invoice
                          </span>
                        </div>
                        <Button onClick={handleAcceptInvoice} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
                          <Check className="h-4 w-4 mr-2" />
                          Accept Invoice
                        </Button>
                      </div>
                    )}
                    
                    {invoice.status === 'accepted' && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-800 dark:text-green-300">
                          This invoice has been accepted
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <div className="flex items-center mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                        <Package className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Products / Packages</h4>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-gradient-to-br from-gray-50/50 to-slate-50/50 dark:from-gray-900/30 dark:to-slate-900/30 backdrop-blur-sm">
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
                          invoice.items.map((item, index) => (
                            <div key={item.id} className="mb-4 pb-4 border-b last:mb-0 last:pb-0 last:border-b-0 p-3 bg-white/60 dark:bg-gray-800/30 rounded-lg">
                              <div className="md:flex md-justify-between md:items-start">
                                <div className="md:flex-1">
                                  <h5 className="font-medium text-gray-900 dark:text-gray-100">{item.name || 'Unnamed Package'}</h5>
                                </div>
                                <div className="md:flex-1 md:pr-4">
                                  {item.description && (
                                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: item.description }} />
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
                                  <div className="font-medium md:text-right w-24 text-blue-600 dark:text-blue-400">
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
                        
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between font-medium text-lg p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg">
                            <span className="text-blue-900 dark:text-blue-100">Total</span>
                            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(invoice.amount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                        <FileText className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                        <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Notes</h4>
                      </div>
                      <div className="border rounded-lg bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-900/10 dark:to-pink-900/10">
                        <RichTextEditor
                          value={invoice.notes || 'No notes provided.'}
                          onChange={() => {}}
                          readOnly={true}
                        />
                      </div>
                    </div>
                    
                    <Separator className="my-6 bg-gradient-to-r from-gray-200 via-slate-200 to-stone-200 dark:from-gray-700 dark:via-slate-700 dark:to-stone-700" />
                    
                    <div className="mt-6">
                      <div className="flex items-center mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                        <CalendarDays className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                        <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">Payment Schedule</h4>
                      </div>
                      
                      {Array.isArray(invoice.paymentSchedules) && invoice.paymentSchedules.length > 0 ? (
                        <PaymentInfoSection
                          invoice={invoice}
                          paymentMethods={displayCompany?.payment_methods}
                          isClientView={isClientView}
                          updatingPaymentId={updatingPaymentId}
                          onUpdateStatus={handlePaymentStatusUpdate}
                          onUpdatePaymentDate={handlePaymentDateUpdate}
                          formatCurrency={formatCurrency}
                        />
                      ) : (
                        <div className="text-muted-foreground border rounded-lg p-4 bg-gradient-to-br from-green-50/30 to-emerald-50/30 dark:from-green-900/10 dark:to-emerald-900/10">
                          Full payment of {formatCurrency(invoice.amount)} due on {new Date(invoice.dueDate).toLocaleDateString()}
                          {displayCompany?.payment_methods && (
                            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                              <PaymentInfoSection
                                invoice={invoice}
                                paymentMethods={displayCompany.payment_methods}
                                isClientView={isClientView}
                                updatingPaymentId={updatingPaymentId}
                                onUpdateStatus={handlePaymentStatusUpdate}
                                onUpdatePaymentDate={handlePaymentDateUpdate}
                                formatCurrency={formatCurrency}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="contract" className="mt-6">
                    {isClientView && invoice.contractTerms && invoice.contractStatus === 'pending' && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          <span className="font-medium text-orange-800 dark:text-orange-300">
                            Action Required: Please review and accept the contract terms
                          </span>
                        </div>
                        <ContractAcceptance
                          companyName={displayCompany?.name || 'Company'}
                          onAccept={handleAcceptContract}
                        />
                      </div>
                    )}
                      
                    {invoice.contractStatus === 'accepted' && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div className="text-green-800 dark:text-green-300">
                          <p>This contract has been accepted</p>
                          {invoice.invoice_accepted_by ? (
                            <div>
                              <p className="text-sm mt-1">Accepted by: {invoice.invoice_accepted_by}</p>
                              {invoice.contract_accepted_at && (
                                <p className="text-sm mt-1">
                                  Accepted at: {new Date(invoice.contract_accepted_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                      <FileText className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Contract Terms</h4>
                    </div>
                    <div className="border rounded-lg bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-900/10 dark:to-indigo-900/10">
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
                    
                    <div className="hidden">
                      DEBUG: invoice_accepted_by = {invoice?.invoice_accepted_by || 'null'}, 
                      type: {invoice?.invoice_accepted_by ? typeof invoice.invoice_accepted_by : 'null'}, 
                      contract_accepted_at: {invoice?.contract_accepted_at || 'null'}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              
              <CardFooter className="justify-end gap-2 flex-wrap pt-4 border-t bg-gradient-to-r from-gray-50/50 to-slate-50/50 dark:from-gray-900/30 dark:to-slate-900/30">
                <Button
                  variant="outline"
                  onClick={handleCopyInvoiceLink}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Copy Invoice Link
                </Button>
                <Button
                  variant="default"
                  onClick={handleDownloadInvoice}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
                {!isClientView && isAdmin && (
                  <Button
                    variant="outline"
                    onClick={handleDebugPdf}
                    className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Debug PDF
                  </Button>
                )}
              </CardFooter>
            </Card>

            <InvoiceShareDialog
              open={shareDialogOpen}
              onOpenChange={setShareDialogOpen}
              invoice={invoice}
              client={client}
              companyName={displayCompany?.name || 'Company'}
              currency={companyCurrency}
            />
          </div>
        </div>
      </PageTransition>
    </>
  );
};

export default InvoiceView;
