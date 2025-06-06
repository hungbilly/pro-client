import React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import { getInvoice, getClient, getJob } from '@/lib/storage';
import { Invoice, Client, Job, InvoiceTemplate, PaymentSchedule } from '@/types';
import { toast } from '@/hooks/use-toast';
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
import { formatCurrency } from '@/lib/utils';

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
  const currency = selectedCompany?.currency || "USD";

  const calculateTotal = (): number => {
    if (!invoice || !invoice.items) return 0;
    return invoice.items.reduce((total, item) => total + (item.quantity * item.rate), 0);
  };

  const getOrdinalNumber = (num: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  const formatCurrencyWithSelected = (amount: number): string => {
    return formatCurrency(amount, currency);
  };

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
            
            // Ensure dueDate has a default value if it's null
            if (!fetchedInvoice.dueDate) {
              fetchedInvoice.dueDate = format(new Date(), 'yyyy-MM-dd');
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

  const handleTemplateSelection = async (templateId: string) => {
    try {
      console.log('Template selection started', { 
        templateId, 
        currentInvoiceNumber: invoice?.number,
        currentItems: invoice?.items?.length || 0,
        currentShootingDate: invoice?.shootingDate
      });
      
      setSelectedTemplate(templateId);
      
      // Find the template in the already loaded templates
      const selectedTemplate = templates.find(t => t.id === templateId);
      
      if (!selectedTemplate) {
        console.error('Selected template not found');
        toast.error('Failed to find selected template');
        return;
      }
      
      // Preserve the current invoice date, number, status and shootingDate
      const currentDate = invoice?.date || format(new Date(), 'yyyy-MM-dd');
      const currentNumber = invoice?.number || '';
      const currentStatus = invoice?.status || 'draft';
      const currentShootingDate = invoice?.shootingDate || (job?.date ? job.date : undefined);
      
      console.log('Preserving invoice fields before template application', { 
        currentDate, 
        currentNumber, 
        currentStatus,
        currentShootingDate,
        hasJob: !!job,
        jobDate: job?.date
      });
      
      // Parse the template content with improved error handling
      let parsedContent: any = {};
      try {
        if (selectedTemplate.content) {
          console.log('Raw template content:', selectedTemplate.content);
          parsedContent = JSON.parse(selectedTemplate.content);
          console.log('Parsed template content:', parsedContent);
        } else {
          console.warn('Template has no content');
          toast.warning('The selected template has no content');
        }
      } catch (e) {
        console.error('Error parsing template content:', e);
        toast.error('Failed to parse template content');
        return;
      }
      
      // Validate parsed content
      if (!parsedContent) {
        console.error('Parsed content is empty');
        toast.error('Template content is empty or invalid');
        return;
      }
      
      // Create a new invoice object with the template data
      const newInvoice: Partial<Invoice> = {
        ...(invoice || {}),
        items: Array.isArray(parsedContent.items) ? parsedContent.items : [],
        contractTerms: parsedContent.contractTerms || '',
        notes: parsedContent.notes || '',
        paymentSchedules: Array.isArray(parsedContent.paymentSchedules) ? parsedContent.paymentSchedules : [],
        // Explicitly preserve these important fields
        date: currentDate,
        number: currentNumber,
        status: currentStatus,
        shootingDate: currentShootingDate,
        // Ensure job relationship is preserved
        jobId: jobId || invoice?.jobId
      };
      
      // Validate the items array
      if (!Array.isArray(newInvoice.items) || newInvoice.items.length === 0) {
        console.warn('Template has no items or invalid items array', {
          isArray: Array.isArray(newInvoice.items),
          itemsLength: Array.isArray(newInvoice.items) ? newInvoice.items.length : 'N/A',
          parsedItems: parsedContent.items
        });
        
        // Ensure we have a valid items array
        newInvoice.items = Array.isArray(newInvoice.items) ? newInvoice.items : [];
        
        if (newInvoice.items.length === 0) {
          toast.warning('The selected template does not contain any items');
        }
      }
      
      console.log('New invoice after template application', { 
        newInvoiceNumber: newInvoice.number,
        itemsCount: newInvoice.items?.length || 0,
        newShootingDate: newInvoice.shootingDate,
        jobId: newInvoice.jobId
      });
      
      // Update the invoice state
      setInvoice(newInvoice as Invoice);
      
      if (newInvoice.items && newInvoice.items.length > 0) {
        toast.success(`Template "${selectedTemplate.name}" applied successfully with ${newInvoice.items.length} items`);
      } else {
        toast.warning(`Template "${selectedTemplate.name}" applied, but contains no items`);
      }
      
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
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
                    onValueChange={handleTemplateSelection}
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
                  onClick={() => {
                    console.log('Template selection cleared, current invoice number:', invoice?.number);
                    setSelectedTemplate(null);
                  }}
                  className="mt-6"
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <InvoiceForm 
          propInvoice={invoice}
          propClientId={clientId || job?.clientId}
          propJobId={jobId}
          propInvoiceId={invoiceId}
          isEditView={isEditView}
          hasContractTemplates={contractTemplates.length > 0}
        />
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
