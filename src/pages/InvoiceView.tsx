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
import { Invoice, Client, Job, CompanyClientView, PaymentSchedule, ContractStatus } from '@/types';
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
import { formatCurrency as utilFormatCurrency } from "@/lib/utils";
import TopNavbar from '@/components/TopNavbar';

const InvoiceView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [clientViewCompany, setClientViewCompany] = useState<CompanyClientView | null>(null);

  const { isAdmin, user } = useAuth();
  const { selectedCompanyId, selectedCompany } = useCompanyContext();
  const { idOrViewLink } = useParams<{ idOrViewLink: string }>();
  const location = useLocation();

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
        
        // First check if it's a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        try {
          if (isUUID) {
            console.log('[InvoiceView] Identifier looks like a UUID, using getInvoice');
            fetchedInvoice = await getInvoice(identifier);
          } else {
            console.log('[InvoiceView] Identifier does not look like a UUID, using getInvoiceByViewLink');
            fetchedInvoice = await getInvoiceByViewLink(identifier);
          }
        } catch (err) {
          console.error('[InvoiceView] Error in primary fetch attempt:', err);
        }
        
        // If first attempt failed, try alternative methods
        if (!fetchedInvoice) {
          console.log('[InvoiceView] Primary fetch failed, trying alternative methods');
          
          const urlPath = location.pathname;
          const lastPartOfUrl = urlPath.split('/').pop() || '';
          
          if (lastPartOfUrl && lastPartOfUrl !== identifier) {
            console.log('[InvoiceView] Trying alternative identifier from URL path:', lastPartOfUrl);
            
            const isLastPartUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPartOfUrl);
            
            try {
              if (isLastPartUUID) {
                fetchedInvoice = await getInvoice(lastPartOfUrl);
              } else {
                fetchedInvoice = await getInvoiceByViewLink(lastPartOfUrl);
              }
            } catch (innerErr) {
              console.error('[InvoiceView] Error in alternative fetch attempt:', innerErr);
            }
          }

          // If still no success, try direct database query as last resort
          if (!fetchedInvoice && isUUID) {
            console.log('[InvoiceView] Trying direct database query as last resort');
            try {
              const { data, error: dbError } = await supabase
                .from('invoices')
                .select('*')
                .eq('id', identifier)
                .single();
                
              if (data && !dbError) {
                console.log('[InvoiceView] Direct DB query successful, transforming to Invoice object');
                // Transform the raw data into an Invoice object
                fetchedInvoice = {
                  id: data.id,
                  number: data.number,
                  clientId: data.client_id,
                  companyId: data.company_id,
                  date: data.date,
                  dueDate: data.due_date,
                  amount: data.amount,
                  status: data.status,
                  notes: data.notes,
                  contractTerms: data.contract_terms,
                  contractStatus: data.contract_status,
                  viewLink: data.view_link,
                  jobId: data.job_id,
                  invoice_accepted_by: data.invoice_accepted_by,
                  contract_accepted_at: data.contract_accepted_at
                } as Invoice;
                
                // Fetch invoice items
                const { data: items } = await supabase
                  .from('invoice_items')
                  .select('*')
                  .eq('invoice_id', data.id);
                  
                if (items) {
                  fetchedInvoice.items = items.map(item => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount
                  }));
                }
                
                // Fetch payment schedules
                const { data: schedules } = await supabase
                  .from('payment_schedules')
                  .select('*')
                  .eq('invoice_id', data.id);
                  
                if (schedules) {
                  fetchedInvoice.paymentSchedules = schedules.map(schedule => ({
                    id: schedule.id,
                    invoiceId: schedule.invoice_id,
                    percentage: schedule.percentage,
                    dueDate: schedule.due_date,
                    status: schedule.status,
                    paymentDate: schedule.payment_date,
                    description: schedule.description
                  }));
                }
              }
            } catch (dbErr) {
              console.error('[InvoiceView] Error in direct DB query:', dbErr);
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
          try {
            const fetchedClient = await getClient(fetchedInvoice.clientId);
            if (!fetchedClient) {
              console.log('[InvoiceView] No client found for clientId:', fetchedInvoice.clientId);
              setError('Client information not found.');
              return;
            }
            
            setClient(fetchedClient);
          } catch (clientErr) {
            console.error('[InvoiceView] Error fetching client:', clientErr);
            // Continue even if client fetch fails
          }
        }

        if (fetchedInvoice.jobId) {
          try {
            const fetchedJob = await getJob(fetchedInvoice.jobId);
            if (fetchedJob) {
              setJob(fetchedJob);
            }
          } catch (jobErr) {
            console.error('[InvoiceView] Error fetching job:', jobErr);
            // Continue even if job fetch fails
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
      
      // If we already have a PDF URL, use it directly
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank');
        toast.success('Invoice downloaded successfully');
        return;
      }
      
      // Generate a new PDF
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          invoiceId: invoice.id,
          forceRegenerate: true // Force regeneration to ensure we get a fresh PDF
        }
      });
      
      if (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate invoice PDF');
        return;
      }
      
      if (data?.pdfUrl) {
        // Update the invoice object with the new PDF URL
        setInvoice(prev => prev ? { ...prev, pdfUrl: data.pdfUrl } : null);
        
        // Open the PDF in a new tab
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
        updated_at: new Date().toISOString(),
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
        website: clientViewCompany.website
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
        <div className="flex justify-center items-center h-screen">
          Loading invoice...
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex flex-col justify-center items-center h-screen">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Button onClick={() => window.location.href = "/invoices"}>
            Go to Invoices
          </Button>
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

  const contractStatusColor = invoice?.contractStatus === 'accepted' 
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';

  return (
    <>
      {!isClientView && user && <TopNavbar />}
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
                        window.location.href = `/job/${invoice.jobId}/invoice/edit/${invoice.id}`;
                      } else {
                        window.location.href = `/invoice/${invoice.id}/edit`;
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
                          <div key={item.id} className="mb-
