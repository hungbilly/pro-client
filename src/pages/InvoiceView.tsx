
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
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', fetchedInvoice.company_id)
            .single();
          
          if (!companyError && companyData) {
            console.info('[InvoiceView] Fetched company data for client view:', companyData);
            setCompany(companyData as Company);
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

  // Add the render return statement
  return (
    <div className="container mx-auto py-8">
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : !invoice ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
          <p className="text-muted-foreground mb-6">The invoice you're looking for could not be found.</p>
          <Button onClick={() => navigate('/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Invoices
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Invoice #{invoice.number}</h1>
              <p className="text-muted-foreground">
                {invoice.date && `Issued: ${new Date(invoice.date).toLocaleDateString()}`}
                {invoice.dueDate && ` | Due: ${new Date(invoice.dueDate).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex space-x-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate(`/invoice/${invoice.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Invoice
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              {invoice.pdfUrl && (
                <Button variant="outline" onClick={() => window.open(invoice.pdfUrl, '_blank')}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              )}
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-1">From</h3>
                    {company && (
                      <div className="space-y-1">
                        {company.logo_url && (
                          <div className="mb-2">
                            <img 
                              src={company.logo_url} 
                              alt={`${company.name} logo`} 
                              className="h-12 object-contain" 
                            />
                          </div>
                        )}
                        <p className="font-medium">{company.name}</p>
                        {company.address && <p>{company.address}</p>}
                        {company.email && <p>{company.email}</p>}
                        {company.phone && <p>{company.phone}</p>}
                        {company.website && (
                          <p>
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center">
                              <Globe className="h-3 w-3 mr-1" /> {company.website}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-1">To</h3>
                    {client && (
                      <div className="space-y-1">
                        <p className="font-medium">{client.name}</p>
                        {client.address && <p>{client.address}</p>}
                        {client.email && <p>{client.email}</p>}
                        {client.phone && <p>{client.phone}</p>}
                      </div>
                    )}
                  </div>
                  
                  {job && (
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">Job Details</h3>
                      <div className="space-y-1">
                        <p className="font-medium">{job.title}</p>
                        {job.date && <p>Date: {new Date(job.date).toLocaleDateString()}</p>}
                        {job.location && <p>Location: {job.location}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">Items</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Description</th>
                        <th className="px-4 py-2 text-right font-medium">Quantity</th>
                        <th className="px-4 py-2 text-right font-medium">Rate</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground mt-1" 
                                   dangerouslySetInnerHTML={{ __html: item.description }} />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.rate)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/20">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">Total</td>
                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(invoice.amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">Payment Schedule</h3>
                  <PaymentScheduleTable 
                    schedules={invoice.paymentSchedules} 
                    totalAmount={invoice.amount}
                    onMarkAsPaid={isAdmin ? (scheduleId, paymentDate) => {
                      // Handle marking payment as paid logic here
                      toast.success("Payment status updated");
                    } : undefined}
                  />
                </div>
              )}
              
              {invoice.notes && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Notes</h3>
                  <div className="p-4 bg-muted/20 rounded-md">
                    <div dangerouslySetInnerHTML={{ __html: invoice.notes }} />
                  </div>
                </div>
              )}
              
              {invoice.contractTerms && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Contract Terms</h3>
                  <div className="p-4 bg-muted/20 rounded-md max-h-[400px] overflow-auto">
                    <div dangerouslySetInnerHTML={{ __html: invoice.contractTerms }} />
                  </div>
                  {isClientView && !isContractAccepted && (
                    <div className="mt-4">
                      <Button 
                        onClick={() => {
                          // Handle accepting contract terms
                          setIsContractAccepted(true);
                          toast.success("Contract terms accepted");
                        }}
                      >
                        Accept Contract Terms
                      </Button>
                    </div>
                  )}
                  {isContractAccepted && (
                    <div className="mt-2 text-sm text-green-600 flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Contract terms accepted
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InvoiceView;
