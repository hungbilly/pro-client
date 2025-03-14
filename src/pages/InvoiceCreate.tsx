
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
    if (!jobId) {
      navigate('/');
      return;
    }

    setLoading(true);
    getJob(jobId)
      .then(fetchedJob => {
        if (fetchedJob) {
          setJob(fetchedJob);
        } else {
          toast.error('Job not found');
          navigate('/');
        }
      })
      .catch(error => {
        console.error('Failed to fetch job:', error);
        toast.error('Failed to load job data');
        navigate('/');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [jobId, navigate]);

  if (!jobId) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading job data...</div>
        </div>
      </PageTransition>
    );
  }

  if (!job) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <div className="text-center">Job not found</div>
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
