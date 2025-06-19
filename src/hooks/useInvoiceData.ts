import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getInvoice, getClient, getJob } from '@/lib/storage';
import { Invoice, Client, Job, InvoiceTemplate } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { supabase, logDebug, logError, logDataTransformation, parseDate } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/context/CompanyContext';

interface UseInvoiceDataResult {
  invoice: Invoice | undefined;
  setInvoice: React.Dispatch<React.SetStateAction<Invoice | undefined>>;
  client: Client | null;
  job: Job | null;
  loading: boolean;
  contractTemplates: any[];
  loadingTemplates: boolean;
  templates: InvoiceTemplate[];
  selectedTemplate: string | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string | null>>;
  handleTemplateSelection: (templateId: string) => Promise<void>;
  isEditView: boolean;
  checkDuplicateInvoiceNumber: (number: string, currentInvoiceId?: string) => Promise<boolean>;
  handleInvoiceDeleted: (invoiceId: string) => void;
  clientId: string | undefined;
  jobId: string | undefined;
  invoiceId: string | undefined;
}

export function useInvoiceData(): UseInvoiceDataResult {
  const { clientId, jobId, invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractTemplates, setContractTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { selectedCompany } = useCompanyContext();
  const toast = useToast();

  const isEditView = location.pathname.includes('/edit');

  // Helper function to normalize payment schedules
  const normalizePaymentSchedules = (fetchedInvoice: Invoice) => {
    if (!fetchedInvoice.paymentSchedules || !Array.isArray(fetchedInvoice.paymentSchedules)) {
      return fetchedInvoice;
    }

    const invoiceAmount = fetchedInvoice.amount || 0;
    
    // Fix payment schedules that have missing or zero amounts but have percentages
    const normalizedSchedules = fetchedInvoice.paymentSchedules.map(schedule => {
      const currentAmount = schedule.amount || 0;
      const currentPercentage = schedule.percentage || 0;
      
      // If amount is missing or zero but percentage exists, calculate amount from percentage
      if (currentAmount === 0 && currentPercentage > 0 && invoiceAmount > 0) {
        const calculatedAmount = (invoiceAmount * currentPercentage) / 100;
        console.log(`PaymentSchedule ${schedule.id}: Fixed amount from ${currentAmount} to ${calculatedAmount} (${currentPercentage}%)`);
        return {
          ...schedule,
          amount: calculatedAmount
        };
      }
      
      // If amount exists but percentage is missing, calculate percentage from amount
      if (currentAmount > 0 && currentPercentage === 0 && invoiceAmount > 0) {
        const calculatedPercentage = (currentAmount / invoiceAmount) * 100;
        console.log(`PaymentSchedule ${schedule.id}: Fixed percentage from ${currentPercentage} to ${calculatedPercentage} (${currentAmount})`);
        return {
          ...schedule,
          percentage: calculatedPercentage
        };
      }
      
      return schedule;
    });

    return {
      ...fetchedInvoice,
      paymentSchedules: normalizedSchedules
    };
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
              if (!parsedDate) logError('Invalid invoice date', { date: fetchedInvoice.date });
            }
            if (!fetchedInvoice.dueDate) {
              fetchedInvoice.dueDate = format(new Date(), 'yyyy-MM-dd');
            }
            
            // Normalize payment schedules data before setting the invoice
            const normalizedInvoice = normalizePaymentSchedules(fetchedInvoice);
            console.log('useInvoiceData: Normalized invoice payment schedules', normalizedInvoice.paymentSchedules);
            setInvoice(normalizedInvoice);

            if (fetchedInvoice.clientId && !client) {
              const clientData = await getClient(fetchedInvoice.clientId);
              setClient(clientData);
            }
            if (fetchedInvoice.jobId && !job) {
              const jobData = await getJob(fetchedInvoice.jobId);
              setJob(jobData);
            }
          } else {
            toast.toast({ title: 'Invoice not found', variant: "destructive" });
            if (jobId) navigate(`/job/${jobId}`);
            else if (clientId) navigate(`/client/${clientId}`);
            else navigate('/');
          }
        }
      } catch (error) {
        logError('Failed to fetch data:', error);
        toast.toast({ title: 'Failed to load data', variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    const fetchContractTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const { data, error } = await supabase
          .from('contract_templates')
          .select('id, name, content')
          .order('name', { ascending: true });
        if (error) throw error;
        setContractTemplates(data || []);
      } catch (error) {
        toast.toast({ title: 'Failed to load contract templates', variant: "destructive" });
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
          let parsedContent: any = {};
          try {
            parsedContent = template.content ? JSON.parse(template.content) : {};
          } catch (e) {
            parsedContent = {};
          }
          return {
            id: template.id,
            name: template.name,
            description: template.description || undefined,
            items: parsedContent.items || [],
            discounts: parsedContent.discounts || [],
            paymentSchedules: parsedContent.paymentSchedules || [],
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
        toast.toast({ title: 'Failed to load invoice templates', variant: "destructive" });
      }
    };

    fetchInvoiceData();
    fetchContractTemplates();
    fetchTemplates();
    // eslint-disable-next-line
  }, [clientId, jobId, invoiceId, navigate, selectedCompany]);

  const checkDuplicateInvoiceNumber = async (number: string, currentInvoiceId?: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, number')
        .eq('number', number);

      if (error) throw error;
      if (data && data.length > 0) {
        if (currentInvoiceId && data.length === 1 && data[0].id === currentInvoiceId) {
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const handleInvoiceDeleted = (invoiceId_: string) => {
    if (invoiceId_ === invoice?.id) {
      toast.toast({ title: "This invoice has been deleted", variant: "default" });
      if (jobId) navigate(`/job/${jobId}`);
      else if (clientId) navigate(`/client/${clientId}`);
      else navigate('/');
    }
  };

  const handleTemplateSelection = async (templateId: string) => {
    setSelectedTemplate(templateId);

    const selected = templates.find(t => t.id === templateId);
    if (!selected) {
      toast.toast({ title: 'Failed to find selected template', variant: "destructive" });
      return;
    }
    const currentDate = invoice?.date || format(new Date(), 'yyyy-MM-dd');
    let currentNumber =
      typeof invoice?.number === "string" && invoice.number.trim() !== ""
        ? invoice.number
        : undefined;
    const currentStatus = invoice?.status || "draft";
    const currentShootingDate =
      invoice?.shootingDate || (job?.date ? job.date : undefined);
    const currentInvoiceId = invoice?.id || "";
    const currentClientId =
      invoice?.clientId || job?.clientId || clientId || "";
    // Generate invoice number if needed
    const { generateInvoiceNumber } = await import('@/utils/invoiceNumberGenerator');
    let parsedContent: any = {};
    try {
      if (selected.content) parsedContent = JSON.parse(selected.content);
    } catch (e) {
      toast.toast({ title: 'Failed to parse template content', variant: "destructive" });
      return;
    }
    if (!parsedContent) {
      toast.toast({ title: 'Template content is empty or invalid', variant: "destructive" });
      return;
    }
    const newInvoice: Partial<Invoice> = {
      ...(invoice || {}),
      items: Array.isArray(parsedContent.items) ? parsedContent.items : [],
      contractTerms: parsedContent.contractTerms || '',
      notes: parsedContent.notes || '',
      paymentSchedules: Array.isArray(parsedContent.paymentSchedules) ? parsedContent.paymentSchedules : [],
      id: currentInvoiceId,
      clientId: currentClientId,
      date: currentDate,
      status: currentStatus,
      shootingDate: currentShootingDate,
      jobId: jobId || invoice?.jobId
    };
    if (!currentNumber) {
      currentNumber = await generateInvoiceNumber();
    }
    if (currentNumber !== undefined) {
      newInvoice.number = currentNumber;
    } else {
      if ("number" in newInvoice) delete newInvoice.number;
    }
    if (Array.isArray(parsedContent.discounts) && parsedContent.discounts.length > 0) {
      const discountItems = parsedContent.discounts.map((discount: any) => {
        if (discount.type === 'fixed') {
          return {
            id: `template-discount-${discount.id}`,
            name: discount.name,
            description: `Discount: ${discount.name}`,
            quantity: 1,
            rate: -Math.abs(discount.amount),
            amount: -Math.abs(discount.amount)
          };
        }
        return null;
      }).filter(Boolean);
      newInvoice.items = [...(newInvoice.items || []), ...discountItems];
    }
    if (!Array.isArray(newInvoice.items) || newInvoice.items.length === 0) {
      newInvoice.items = Array.isArray(newInvoice.items) ? newInvoice.items : [];
      if (newInvoice.items.length === 0) {
        toast.toast({ title: 'The selected template does not contain any items', variant: "warning" });
      }
    }
    setInvoice(newInvoice as Invoice);
    // Show toast for success
    toast.toast({ title: `Template "${selected.name}" applied` });
  };

  return {
    invoice, setInvoice,
    client, job, loading,
    contractTemplates, loadingTemplates,
    templates, selectedTemplate, setSelectedTemplate,
    handleTemplateSelection,
    isEditView,
    checkDuplicateInvoiceNumber,
    handleInvoiceDeleted,
    clientId, jobId, invoiceId
  };
}
