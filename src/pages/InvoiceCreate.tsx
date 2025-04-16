import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import { getInvoice } from '@/lib/storage';
import { Invoice } from '@/types';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase, logDebug, logError, logDataTransformation, formatDate, parseDate } from '@/integrations/supabase/client';

interface ContractTemplate {
  id: string;
  name: string;
  content?: string;
  description?: string;
}

const InvoiceCreate = () => {
  const { clientId, jobId, invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [loading, setLoading] = useState(!!invoiceId);
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  logDebug('InvoiceCreate component initialized with params:', { clientId, jobId, invoiceId });
  
  useEffect(() => {
    const fetchInvoice = async () => {
      if (invoiceId) {
        try {
          logDebug('Fetching invoice with ID:', invoiceId);
          const fetchedInvoice = await getInvoice(invoiceId);
          logDataTransformation('Fetched invoice', fetchedInvoice);
          
          if (fetchedInvoice) {
            // Validate dates
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
            
            logDebug('Fetched invoice with payment schedules:', {
              schedules: fetchedInvoice.paymentSchedules,
              count: fetchedInvoice.paymentSchedules?.length || 0,
              firstSchedule: fetchedInvoice.paymentSchedules?.[0]
            });
            
            if (fetchedInvoice.paymentSchedules && fetchedInvoice.paymentSchedules.length > 0) {
              // Log detailed information about the first few payment schedules
              fetchedInvoice.paymentSchedules.slice(0, 3).forEach((schedule, index) => {
                const parsedDueDate = parseDate(schedule.dueDate);
                logDebug(`Payment schedule ${index + 1}:`, {
                  id: schedule.id,
                  dueDate: schedule.dueDate,
                  dueDateParsed: parsedDueDate ? parsedDueDate.toISOString() : 'invalid date',
                  percentage: schedule.percentage,
                  status: schedule.status
                });
              });
            }
            
            setInvoice(fetchedInvoice);
          } else {
            console.error('Invoice not found for ID:', invoiceId);
            toast.error('Invoice not found');
            // Navigate back based on available params
            if (jobId) {
              navigate(`/job/${jobId}`);
            } else if (clientId) {
              navigate(`/client/${clientId}`);
            } else {
              navigate('/');
            }
          }
        } catch (error) {
          logError('Failed to fetch invoice:', error);
          toast.error('Failed to load invoice data');
        } finally {
          setLoading(false);
        }
      } else {
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

    if (invoiceId && loading) {
      fetchInvoice();
    }
    
    fetchContractTemplates();
  }, [invoiceId, clientId, jobId, navigate, loading]);

  if (loading || loadingTemplates) {
    return (
      <PageTransition>
        <div className="container py-8 flex justify-center items-center">
          <div>Loading data...</div>
        </div>
      </PageTransition>
    );
  }

  if (invoice) {
    logDebug('Rendering InvoiceForm with invoice data:', { 
      id: invoice.id,
      clientId: invoice.clientId,
      jobId: invoice.jobId,
      amount: invoice.amount,
      date: invoice.date,
      dateParsed: invoice.date ? new Date(invoice.date).toLocaleDateString() : 'no date',
      status: invoice.status,
      paymentSchedules: invoice.paymentSchedules?.map(s => ({
        id: s.id,
        dueDate: s.dueDate,
        dueDateParsed: s.dueDate ? new Date(s.dueDate).toLocaleDateString() : 'no date',
        percentage: s.percentage,
        status: s.status
      }))
    });
  }

  logDebug('Rendering InvoiceForm with props:', { 
    hasInvoice: !!invoice, 
    clientId, 
    jobId, 
    invoiceId,
    contractTemplatesCount: contractTemplates.length,
    paymentSchedules: invoice?.paymentSchedules?.length || 0,
    invoiceDate: invoice?.date,
    invoiceStatus: invoice?.status
  });

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

  return (
    <PageTransition>
      <div className="container py-8">
        <InvoiceForm 
          invoice={invoice}
          clientId={clientId}
          jobId={jobId}
          invoiceId={invoiceId}
          contractTemplates={contractTemplates}
          checkDuplicateInvoiceNumber={checkDuplicateInvoiceNumber}
          onInvoiceDeleted={handleInvoiceDeleted}
        />
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
