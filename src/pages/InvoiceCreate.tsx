
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import { getJob } from '@/lib/storage';
import { Job } from '@/types';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';

const InvoiceCreate = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // JobId is required for invoice creation
        if (!jobId) {
          toast.error('Job information is required to create an invoice');
          navigate('/');
          return;
        }

        const fetchedJob = await getJob(jobId);
        if (fetchedJob) {
          setJob(fetchedJob);
        } else {
          toast.error('Job not found');
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
  }, [jobId, navigate]);

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading data...</div>
        </div>
      </PageTransition>
    );
  }

  if (!job) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="text-center">Job information not available</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Create Invoice for {job.title}</h1>
        <InvoiceForm clientId={job.clientId} jobId={jobId} />
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
