import React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import { getInvoice, getClient, getJob } from '@/lib/storage';
import { Invoice, Client, Job, InvoiceTemplate } from '@/types';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase, logDebug, logError, logDataTransformation, formatDate, parseDate } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, User, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { FormLabel } from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCompanyContext } from '@/context/CompanyContext';

interface ContractTemplate {
  id: string;
  name: string;
  content?: string;
  description?: string;
}

const InvoiceCreate = () => {
  const { clientId, jobId, invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isEditView = location.pathname.includes('/edit');
  
  console.log('InvoiceCreate rendered with path:', location.pathname, 'isEditView:', isEditView);
  
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { selectedCompany } = useCompanyContext();

  useEffect(() => {
    const fetchInvoiceData = async () => {
      setLoading(true);
      try {
        if (clientId) {
          const clientData = await getClient(clientId);
          setClient(clientData);
        }

        if (jobId) {
          const jobData = await getJob(jobId);
          setJob(jobData);
          
          if (jobData && jobData.clientId && !clientId) {
            const clientData = await getClient(jobData.clientId);
            setClient(clientData);
          }
        }

        if (invoiceId) {
          logDebug('Fetching invoice with ID:', invoiceId);
          const fetchedInvoice = await getInvoice(invoiceId);
          logDataTransformation('Fetched invoice', fetchedInvoice);
          
          if (fetchedInvoice) {
            if (fetchedInvoice.date) {
              const parsedDate = parseDate(fetchedInvoice.date);
              if (parsedDate) {
                logDebug('Invoice date validated:', { 
                  original: fetchedInvoice.date,
                  parsed: parsedDate.toISOString(),
                  formatted: new Date(parsedDate).toLocaleDateString()
                });
              } else {
                logError('Invalid invoice date', { date: fetchedInvoice.date });
              }
            }
            
            setInvoice(fetchedInvoice);
            
            if (fetchedInvoice.clientId && !client) {
              const clientData = await getClient(fetchedInvoice.clientId);
              setClient(clientData);
            }
            
            if (fetchedInvoice.jobId && !job) {
              const jobData = await getJob(fetchedInvoice.jobId);
              setJob(jobData);
            }
          } else {
            console.error('Invoice not found for ID:', invoiceId);
            toast.error('Invoice not found');
            if (jobId) {
              navigate(`/job/${jobId}`);
            } else if (clientId) {
              navigate(`/client/${clientId}`);
            } else {
              navigate('/');
            }
          }
        }
      } catch (error) {
        logError('Failed to fetch data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    const fetchContractTemplates = async () => {
      try {
        logDebug('Fetching contract templates');
        setLoadingTemplates(true);
        const { data, error } = await supabase
          .from('contract_templates')
          .select('id, name, content')
          .order('name', { ascending: true });

        if (error) {
          logError('Error fetching contract templates:', error);
          throw error;
        }
        
        logDebug('Contract templates fetched:', {
          count: data?.length || 0,
          templates: data?.map(t => ({ id: t.id, name: t.name }))
        });
        
        setContractTemplates(data || []);
      } catch (error) {
        logError('Error fetching contract templates:', error);
        toast.error('Failed to load contract templates');
      } finally {
        setLoadingTemplates(false);
      }
    };

    const fetchTemplates = async () => {
      if (!selectedCompany) return;
      
      try {
        const { data, error } = await supabase
          .from('invoice_templates')
          .select('*')
          .eq('company_id', selectedCompany.id);

        if (error) throw error;
        
        const formattedTemplates = data?.map(template => {
          let parsedContent;
          try {
            parsedContent = template.content ? JSON.parse(template.content) : {};
          } catch (e) {
            console.error('Error parsing template content:', e);
            parsedContent = {};
          }
          
          return {
            id: template.id,
            name: template.name,
            description: template.description || undefined,
            items: parsedContent.items || [],
            contractTerms: parsedContent.contractTerms || undefined,
            notes: parsedContent.notes || undefined,
            companyId: template.company_id,
            userId: template.user_id,
            createdAt: template.created_at,
            updatedAt: template.updated_at,
            company_id: template.company_id,
            user_id: template.user_id,
            content: template.content,
            created_at: template.created_at,
            updated_at: template.updated_at,
          };
        }) as InvoiceTemplate[];
        
        setTemplates(formattedTemplates || []);
      } catch (error) {
        console.error('Error fetching invoice templates:', error);
        toast.error('Failed to load invoice templates');
      }
    };

    fetchInvoiceData();
    fetchContractTemplates();
    fetchTemplates();
  }, [clientId, jobId, invoiceId, navigate, selectedCompany]);

  useEffect(() => {
    if (!invoice) return;

    const total = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    
    if (total > 0 && (!invoice.paymentSchedules || invoice.paymentSchedules.length === 0) && !invoice.id) {
      const newSchedule = {
        id: generateId(),
        percentage: 100,
        amount: total,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'unpaid',
        description: 'Full Payment'
      };

      setInvoice(prev => ({
        ...prev,
        paymentSchedules: [newSchedule]
      }));
    }
  }, [invoice?.items, invoice?.id]);

  if (loading || loadingTemplates) {
    return (
      <PageTransition>
        <div className="container py-8 flex justify-center items-center">
          <div>Loading data...</div>
        </div>
      </PageTransition>
    );
  }

  const checkDuplicateInvoiceNumber = async (number: string, currentInvoiceId?: string) => {
    try {
      logDebug('Checking for duplicate invoice number:', number);
      
      const { data, error } = await supabase
        .from('invoices')
        .select('id, number')
        .eq('number', number);
        
      if (error) {
        logError('Error checking duplicate invoice number:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        if (currentInvoiceId && data.length === 1 && data[0].id === currentInvoiceId) {
          return false;
        }
        
        logDebug('Found duplicate invoice number:', {
          number,
          matches: data.map(inv => ({ id: inv.id, number: inv.number }))
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logError('Error in checkDuplicateInvoiceNumber:', error);
      return false;
    }
  };

  const handleInvoiceDeleted = (invoiceId: string) => {
    if (invoiceId === invoice?.id) {
      toast.info("This invoice has been deleted");
      if (jobId) {
        navigate(`/job/${jobId}`);
      } else if (clientId) {
        navigate(`/client/${clientId}`);
      } else {
        navigate('/');
      }
    }
  };

  const getBreadcrumbPaths = () => {
    const paths = [
      { label: "Dashboard", path: "/" },
    ];
    
    if (job) {
      paths.push({ label: "Jobs", path: "/jobs" });
      paths.push({ label: job.title, path: `/job/${job.id}` });
    } else if (client) {
      paths.push({ label: "Clients", path: "/clients" });
      paths.push({ label: client.name, path: `/client/${client.id}` });
    }
    
    paths.push({ label: invoice ? "Edit Invoice" : "New Invoice", path: "#" });
    
    return paths;
  };
  
  const paths = getBreadcrumbPaths();

  return (
    <PageTransition>
      <div className="container py-8">
        <div className="flex flex-col space-y-2 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{invoice ? 'Edit Invoice' : 'New Invoice'}</h1>
          <div className="text-sm text-muted-foreground flex items-center">
            {paths.map((path, index) => (
              <React.Fragment key={path.path}>
                {index > 0 && <span className="mx-1">{'>'}</span>}
                {path.path === '#' ? (
                  <span>{path.label}</span>
                ) : (
                  <span 
                    className="hover:underline cursor-pointer" 
                    onClick={() => navigate(path.path)}
                  >
                    {path.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {(job || client) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {job && (
              <Card className="bg-[#9ECAE1] text-white border-[#9ECAE1]">
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-4">Job</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-4 w-4 text-white" />
                    <span className="font-medium">{job.title}</span>
                  </div>
                  
                  <div className="text-sm">
                    {job.description && (
                      <div className="mb-3">{job.description}</div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4 text-white" />
                      <span>
                        {job.date ? (
                          format(new Date(job.date), 'PPP')
                        ) : (
                          'No date specified'
                        )}
                        {job.startTime && job.endTime && (
                          <span> ({job.startTime} - {job.endTime})</span>
                        )}
                      </span>
                    </div>
                    
                    {job.location && (
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin className="h-4 w-4 text-white" />
                        <span>{job.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {client && (
              <Card className="bg-blue-500 text-white border-blue-600">
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-4">Client</h2>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{client.name}</span>
                  </div>
                  
                  <div className="text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4" />
                      <span>{client.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!job && !client && (
          <div className="mb-6">
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <p className="text-amber-800">
                  This invoice is not associated with a job or client. It's recommended to create invoices from a job or client page.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {templates.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="flex-grow">
                  <FormLabel>Use Template (Optional)</FormLabel>
                  <Select
                    value={selectedTemplate || ''}
                    onValueChange={(value) => setSelectedTemplate(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                  className="mt-6"
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <InvoiceForm 
          invoice={invoice}
          clientId={clientId || job?.clientId}
          jobId={jobId}
          invoiceId={invoiceId}
          isEditView={isEditView}
          contractTemplates={contractTemplates}
          checkDuplicateInvoiceNumber={checkDuplicateInvoiceNumber}
          onInvoiceDeleted={handleInvoiceDeleted}
        />
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
