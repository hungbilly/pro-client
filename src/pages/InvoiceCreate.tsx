
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import { getInvoice } from '@/lib/storage';
import { Invoice } from '@/types';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';

const InvoiceCreate = () => {
  const { clientId, jobId, invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [loading, setLoading] = useState(!!invoiceId);
  
  useEffect(() => {
    const fetchInvoice = async () => {
      if (invoiceId) {
        try {
          const fetchedInvoice = await getInvoice(invoiceId);
          if (fetchedInvoice) {
            console.log('Fetched invoice with payment schedules:', fetchedInvoice.paymentSchedules);
            setInvoice(fetchedInvoice);
          } else {
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

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, clientId, jobId, navigate]);

  if (loading) {
    return (
      <PageTransition>
        <div className="container py-8 flex justify-center items-center">
          <div>Loading invoice data...</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container py-8">
        <InvoiceForm 
          invoice={invoice}
          clientId={clientId}
          jobId={jobId}
          invoiceId={invoiceId}
        />
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
