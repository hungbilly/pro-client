
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import { getInvoice } from '@/lib/storage';
import { Invoice } from '@/types';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase } from '@/integrations/supabase/client';

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
  
  console.log('InvoiceCreate component initialized with params:', { clientId, jobId, invoiceId });
  
  useEffect(() => {
    const fetchInvoice = async () => {
      if (invoiceId) {
        try {
          console.log('Fetching invoice with ID:', invoiceId);
          const fetchedInvoice = await getInvoice(invoiceId);
          if (fetchedInvoice) {
            console.log('Fetched invoice with payment schedules:', fetchedInvoice.paymentSchedules);
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
          console.error('Failed to fetch invoice:', error);
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
        console.log('Fetching contract templates');
        setLoadingTemplates(true);
        const { data, error } = await supabase
          .from('contract_templates')
          .select('id, name, content')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching contract templates:', error);
          throw error;
        }
        
        console.log('Contract templates fetched:', data?.length || 0);
        setContractTemplates(data || []);
      } catch (error) {
        console.error('Error fetching contract templates:', error);
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

  console.log('Rendering InvoiceForm with props:', { 
    hasInvoice: !!invoice, 
    clientId, 
    jobId, 
    invoiceId,
    contractTemplatesCount: contractTemplates.length 
  });

  return (
    <PageTransition>
      <div className="container py-8">
        <InvoiceForm 
          invoice={invoice}
          clientId={clientId}
          jobId={jobId}
          invoiceId={invoiceId}
          contractTemplates={contractTemplates}
        />
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
