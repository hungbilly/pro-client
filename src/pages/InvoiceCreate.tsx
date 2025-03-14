
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import { getJob, getClient } from '@/lib/storage';
import { Job, Client } from '@/types';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';

const InvoiceCreate = () => {
  const { jobId, clientId } = useParams<{ jobId?: string; clientId?: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // If jobId is provided, load the job first
        if (jobId) {
          const fetchedJob = await getJob(jobId);
          if (fetchedJob) {
            setJob(fetchedJob);
            return; // We have the job and its clientId
          } else {
            toast.error('Job not found');
            navigate('/');
            return;
          }
        } 
        
        // If jobId not provided but clientId is, load the client
        if (clientId) {
          const fetchedClient = await getClient(clientId);
          if (fetchedClient) {
            setClient(fetchedClient);
          } else {
            toast.error('Client not found');
            navigate('/');
            return;
          }
        } else if (!jobId) {
          // Neither jobId nor clientId provided
          toast.error('Missing job or client information');
          navigate('/');
          return;
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [jobId, clientId, navigate]);

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading data...</div>
        </div>
      </PageTransition>
    );
  }

  // If we have a job, use its clientId
  const effectiveClientId = job?.clientId || (client?.id || '');
  const title = job ? `Create Invoice for ${job.title}` : 'Create Invoice';

  if (!effectiveClientId) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="text-center">Client information not available</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">{title}</h1>
        <InvoiceForm clientId={effectiveClientId} jobId={jobId} />
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
