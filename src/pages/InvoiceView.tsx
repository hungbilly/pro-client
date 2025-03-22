
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, getClient, getJob } from '@/lib/storage';
import { Invoice, Client, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Send, Download, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCompany } from '@/components/CompanySelector';
import InvoiceLayout from '@/components/invoice/InvoiceLayout';
import PageTransition from '@/components/ui-custom/PageTransition';
import PaymentScheduleTable from '@/components/invoice/PaymentScheduleTable';
import { supabase } from '@/integrations/supabase/client';

const InvoiceView = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedCompany } = useCompany();

  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!invoiceId) return;
      
      try {
        setLoading(true);
        const fetchedInvoice = await getInvoice(invoiceId);
        
        if (fetchedInvoice) {
          setInvoice(fetchedInvoice);
          
          // Get Client
          if (fetchedInvoice.clientId) {
            const fetchedClient = await getClient(fetchedInvoice.clientId);
            if (fetchedClient) {
              setClient(fetchedClient);
            }
          }
          
          // Get Job if exists
          if (fetchedInvoice.jobId) {
            const fetchedJob = await getJob(fetchedInvoice.jobId);
            if (fetchedJob) {
              setJob(fetchedJob);
            }
          }
        } else {
          toast.error('Invoice not found');
          navigate('/invoices');
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Error loading invoice');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoiceData();
  }, [invoiceId, navigate]);

  if (loading) {
    return (
      <PageTransition>
        <div className="container py-8">
          <div className="w-full max-w-5xl mx-auto">
            <div className="text-center p-12">Loading invoice...</div>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  if (!invoice || !client) {
    return (
      <PageTransition>
        <div className="container py-8">
          <div className="w-full max-w-5xl mx-auto">
            <div className="text-center p-12">
              <h2 className="text-lg font-medium mb-2">Invoice not found</h2>
              <Button onClick={() => navigate('/invoices')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const handleSendInvoice = async () => {
    if (!client || !invoice) return;
    
    toast.promise(
      async () => {
        try {
          // Here you would implement the actual sending logic
          // For now we just show a success message
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        } catch (error) {
          console.error('Error sending invoice:', error);
          throw new Error('Failed to send invoice');
        }
      },
      {
        loading: 'Sending invoice...',
        success: 'Invoice sent successfully',
        error: 'Failed to send invoice'
      }
    );
  };

  const handleEditInvoice = () => {
    navigate(`/invoice/edit/${invoice.id}`);
  };

  return (
    <PageTransition>
      <div className="container py-8">
        <div className="w-full max-w-5xl mx-auto">
          <div className="mb-6 flex flex-wrap gap-4 justify-between items-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleEditInvoice}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              
              <Button onClick={handleSendInvoice}>
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
          
          <InvoiceLayout
            invoice={invoice}
            client={client}
            job={job}
            company={selectedCompany}
          />
          
          {invoice.paymentSchedules && invoice.paymentSchedules.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Payment Schedule</h3>
              <PaymentScheduleTable 
                schedules={invoice.paymentSchedules} 
                invoiceId={invoice.id}
                invoiceTotal={invoice.amount}
              />
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default InvoiceView;
