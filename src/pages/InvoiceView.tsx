
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem, PaymentSchedule, Client, Company, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, FileText, Mail, Printer, RefreshCw, Download, Globe, Copy, Link, Edit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PaymentDateDialog from '@/components/invoice/PaymentDateDialog';
import PaymentScheduleTable from '@/components/invoice/PaymentScheduleTable';

const SUPABASE_URL = "https://htjvyzmuqsrjpesdurni.supabase.co";

const InvoiceView = () => {
  const { idOrViewLink } = useParams<{ idOrViewLink: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGeneratingStatic, setIsGeneratingStatic] = useState(false);
  const [hasStaticVersion, setHasStaticVersion] = useState(false);
  const [isContractAccepted, setIsContractAccepted] = useState(false);

  const isClientView = idOrViewLink && (!idOrViewLink.includes('-') || idOrViewLink.length < 36);

  useEffect(() => {
    const checkAdmin = async () => {
      setIsAdmin(true);
    };
    
    checkAdmin();
  }, []);

  useEffect(() => {
    const fetchInvoice = async () => {
      setIsLoading(true);
      
      try {
        let fetchedInvoice;
        let viewLink;
        
        if (isClientView) {
          viewLink = idOrViewLink;
          const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('view_link', viewLink)
            .single();
          
          if (error) throw error;
          fetchedInvoice = data;
        } else {
          const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', idOrViewLink)
            .single();
          
          if (error) throw error;
          fetchedInvoice = data;
          viewLink = fetchedInvoice.view_link;
        }
        
        const { data: staticCheck } = await supabase
          .from('clientview_invoice')
          .select('id')
          .eq('invoice_id', fetchedInvoice.id)
          .maybeSingle();
        
        setHasStaticVersion(!!staticCheck);
        
        const mappedInvoice: Invoice = {
          id: fetchedInvoice.id,
          clientId: fetchedInvoice.client_id,
          companyId: fetchedInvoice.company_id,
          jobId: fetchedInvoice.job_id,
          number: fetchedInvoice.number,
          amount: fetchedInvoice.amount,
          date: fetchedInvoice.date,
          dueDate: fetchedInvoice.due_date,
          status: fetchedInvoice.status,
          contractStatus: fetchedInvoice.contract_status,
          notes: fetchedInvoice.notes,
          contractTerms: fetchedInvoice.contract_terms,
          viewLink: fetchedInvoice.view_link,
          items: [],
          shootingDate: fetchedInvoice.shooting_date,
          pdfUrl: fetchedInvoice.pdf_url
        };
        
        setIsContractAccepted(fetchedInvoice.contract_status === 'accepted');
        
        const { data: items, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', fetchedInvoice.id);
        
        if (itemsError) throw itemsError;
        
        mappedInvoice.items = items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount
        }));
        
        const { data: schedules, error: schedulesError } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('invoice_id', fetchedInvoice.id)
          .order('due_date', { ascending: true });
        
        if (!schedulesError && schedules && schedules.length > 0) {
          mappedInvoice.paymentSchedules = schedules.map(schedule => ({
            id: schedule.id,
            description: schedule.description || '',
            dueDate: schedule.due_date,
            percentage: schedule.percentage,
            status: schedule.status as PaymentSchedule['status'],
            paymentDate: schedule.payment_date
          }));
        }
        
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', fetchedInvoice.client_id)
          .single();
        
        if (clientError) throw clientError;
        
        setClient({
          id: clientData.id,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          createdAt: clientData.created_at,
          notes: clientData.notes
        });
        
        if (fetchedInvoice.company_id) {
          // Use the appropriate table based on whether we're in client view or admin view
          const table = isClientView ? 'company_clientview' : 'companies';
          const idField = isClientView ? 'company_id' : 'id';
          
          const { data: companyData, error: companyError } = await supabase
            .from(table)
            .select('*')
            .eq(idField, fetchedInvoice.company_id)
            .single();
          
          if (!companyError && companyData) {
            console.info(`[InvoiceView] Fetched company data from ${table}:`, companyData);
            
            // If we're using company_clientview, it doesn't have all the fields that the Company type expects
            // So we need to create a complete Company object with defaults for missing fields
            if (isClientView) {
              setCompany({
                id: companyData.id,
                name: companyData.name,
                email: companyData.email || '',
                phone: companyData.phone || '',
                address: companyData.address || '',
                website: companyData.website || '',
                logo_url: companyData.logo_url || '',
                is_default: false,
                user_id: '',
                created_at: companyData.created_at || '',
                updated_at: companyData.updated_at || '',
                country: '',
                currency: ''
              } as Company);
            } else {
              setCompany({
                id: companyData.id,
                name: companyData.name,
                email: companyData.email,
                phone: companyData.phone,
                address: companyData.address,
                website: companyData.website,
                logo_url: companyData.logo_url,
                is_default: companyData.is_default || false,
                user_id: companyData.user_id || '',
                created_at: companyData.created_at || '',
                updated_at: companyData.updated_at || '',
                country: companyData.country,
                currency: companyData.currency
              } as Company);
            }
          }
        }
        
        if (fetchedInvoice.job_id) {
          const { data: jobData, error: jobError } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', fetchedInvoice.job_id)
            .single();
          
          if (!jobError && jobData) {
            setJob({
              id: jobData.id,
              clientId: jobData.client_id,
              companyId: jobData.company_id,
              title: jobData.title,
              description: jobData.description || '',
              status: jobData.status as "active" | "completed" | "cancelled",
              date: jobData.date,
              location: jobData.location,
              startTime: jobData.start_time,
              endTime: jobData.end_time,
              isFullDay: jobData.is_full_day,
              createdAt: jobData.created_at,
              updatedAt: jobData.updated_at
            });
          }
        }
        
        if (fetchedInvoice.contract_terms) {
          console.info('[InvoiceView] Fetched invoice with contract terms:', {
            id: fetchedInvoice.id,
            hasContractTerms: !!fetchedInvoice.contract_terms,
            contractTermsLength: fetchedInvoice.contract_terms?.length,
            contractStatus: fetchedInvoice.contract_status,
            contractTermsPreview: fetchedInvoice.contract_terms?.substring(0, 100)
          });
          
          console.info('[InvoiceView] Current invoice contract terms:', {
            hasContractTerms: !!mappedInvoice.contractTerms,
            contractTermsLength: mappedInvoice.contractTerms?.length,
            contractStatus: mappedInvoice.contractStatus,
            contractPreview: mappedInvoice.contractTerms?.substring(0, 100)
          });
        }
        
        setInvoice(mappedInvoice);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice data.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (idOrViewLink) {
      fetchInvoice();
    }
  }, [idOrViewLink, isClientView]);

  const handleGenerateStaticHTML = async () => {
    if (!invoice) return;
    
    setIsGeneratingStatic(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-static-invoice', {
        body: { invoiceId: invoice.id }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success('Static HTML version of invoice generated successfully');
        setHasStaticVersion(true);
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating static invoice:', error);
      toast.error('Failed to generate static HTML version of invoice');
    } finally {
      setIsGeneratingStatic(false);
    }
  };

  const handleViewStaticHTML = () => {
    if (!invoice) return;
    
    window.open(`${SUPABASE_URL}/functions/v1/serve-static-invoice/${invoice.viewLink}`, '_blank');
  };

  const handleAcceptContract = async () => {
    if (!invoice) return;
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ contract_status: 'accepted' })
        .eq('id', invoice.id);
      
      if (error) throw error;
      
      setIsContractAccepted(true);
      setInvoice(prev => prev ? { ...prev, contractStatus: 'accepted' } : null);
      toast.success('Contract accepted successfully');
      
      handleGenerateStaticHTML();
    } catch (error) {
      console.error('Error accepting contract:', error);
      toast.error('Failed to accept contract');
    }
  };

  const handleMarkAsPaid = async (scheduleId: string, paymentDate: string) => {
    if (!invoice) return;
    
    try {
      const { error: updateError } = await supabase
        .from('payment_schedules')
        .update({ 
          status: 'paid',
          payment_date: paymentDate
        })
        .eq('id', scheduleId);
      
      if (updateError) throw updateError;
      
      setInvoice(prev => {
        if (!prev || !prev.paymentSchedules) return prev;
        
        const updatedSchedules = prev.paymentSchedules.map(schedule => 
          schedule.id === scheduleId 
            ? { ...schedule, status: 'paid' as PaymentSchedule['status'], paymentDate } 
            : schedule
        );
        
        return { ...prev, paymentSchedules: updatedSchedules };
      });
      
      const { data: schedules, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('status')
        .eq('invoice_id', invoice.id);
      
      if (schedulesError) throw schedulesError;
      
      const allPaid = schedules.every(s => s.status === 'paid');
      
      if (allPaid) {
        const { error: invoiceUpdateError } = await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', invoice.id);
        
        if (invoiceUpdateError) throw invoiceUpdateError;
        
        setInvoice(prev => prev ? { ...prev, status: 'paid' } : null);
        toast.success('All payments received. Invoice marked as paid.');
      } else {
        toast.success('Payment recorded successfully.');
      }
      
      handleGenerateStaticHTML();
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.error('Failed to update payment status.');
    }
  };

  const handleCopyClientLink = () => {
    if (!invoice) return;
    
    const clientViewUrl = `${window.location.origin}/invoice/${invoice.viewLink}`;
    navigator.clipboard.writeText(clientViewUrl)
      .then(() => toast.success('Client view link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  const handleEditInvoice = () => {
    if (!invoice) return;
    navigate(`/invoice/${invoice.id}/edit`);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const renderHtmlContent = (htmlContent: string) => {
    return { __html: htmlContent };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-8">Loading invoice...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice || !client) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-8">Invoice not found.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Invoice #{invoice.number}</CardTitle>
            <CardDescription>
              Issued on {new Date(invoice.date).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyClientLink}>
                  <Link className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                {invoice.pdfUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </a>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleEditInvoice}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateStaticHTML}
                  disabled={isGeneratingStatic}
                >
                  {isGeneratingStatic ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      {hasStaticVersion ? 'Regenerate Static HTML' : 'Generate Static HTML'}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">STATUS</h3>
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                  {invoice.status.toUpperCase()}
                </span>
                {invoice.contractStatus && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getContractStatusBadgeClass(invoice.contractStatus)}`}>
                    CONTRACT {invoice.contractStatus.toUpperCase()}
                  </span>
                )}
              </div>
              
              <h3 className="text-sm font-medium text-gray-500 mt-4 mb-1">FROM</h3>
              <div className="text-sm">
                {company?.logo_url && (
                  <div className="mb-2">
                    <img 
                      src={company.logo_url} 
                      alt={`${company.name} logo`} 
                      className="max-h-16 object-contain"
                    />
                  </div>
                )}
                <div className="font-medium">{company?.name || 'Your Company'}</div>
                {company?.email && <div>{company.email}</div>}
                {company?.phone && <div>{company.phone}</div>}
                {company?.address && <div>{company.address}</div>}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">INVOICE FOR</h3>
              <div className="text-sm">
                <div className="font-medium">{client.name}</div>
                {client.email && <div>{client.email}</div>}
                {client.phone && <div>{client.phone}</div>}
                {client.address && <div>{client.address}</div>}
              </div>
              
              {job && (
                <>
                  <h3 className="text-sm font-medium text-gray-500 mt-4 mb-1">JOB</h3>
                  <div className="text-sm">
                    <div className="font-medium">{job.title}</div>
                    {job.date && <div>Date: {new Date(job.date).toLocaleDateString()}</div>}
                    {job.location && <div>Location: {job.location}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Invoice Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Item</th>
                    <th className="text-left py-2 px-4">Description</th>
                    <th className="text-right py-2 px-4">Quantity</th>
                    <th className="text-right py-2 px-4">Rate</th>
                    <th className="text-right py-2 px-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 px-4">{item.name || item.productName || 'Unnamed Item'}</td>
                      <td className="py-2 px-4" dangerouslySetInnerHTML={renderHtmlContent(item.description)}></td>
                      <td className="py-2 px-4 text-right">{item.quantity}</td>
                      <td className="py-2 px-4 text-right">{formatCurrency(item.rate)}</td>
                      <td className="py-2 px-4 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td colSpan={4} className="py-2 px-4 text-right">Total:</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(invoice.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Payment Schedule</h3>
              <PaymentScheduleTable 
                schedules={invoice.paymentSchedules} 
                totalAmount={invoice.amount}
                onMarkAsPaid={isAdmin ? handleMarkAsPaid : undefined}
              />
            </div>
          )}
          
          {invoice.notes && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                {invoice.notes}
              </div>
            </div>
          )}
          
          {invoice.contractTerms && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Contract Terms</h3>
              <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap" 
                   dangerouslySetInnerHTML={renderHtmlContent(invoice.contractTerms)}>
              </div>
            </div>
          )}
        </CardContent>
        
        {isClientView && invoice.contractTerms && !isContractAccepted && (
          <CardFooter className="flex flex-col items-start pt-6 mt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Contract Acceptance</h3>
            <p className="mb-4">Please review the contract terms above and accept if you agree.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>Accept Contract</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Accept Contract</AlertDialogTitle>
                  <AlertDialogDescription>
                    By accepting this contract, you agree to all the terms and conditions outlined above.
                    This acceptance is legally binding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAcceptContract}>Accept</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        )}
        
        {isClientView && invoice.contractTerms && isContractAccepted && (
          <CardFooter className="flex flex-col items-start pt-6 mt-4 border-t">
            <div className="flex items-center text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p>Contract accepted</p>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default InvoiceView;
