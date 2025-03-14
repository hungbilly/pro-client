
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';
import { getJob } from '@/lib/storage';
import { Job } from '@/types';
import PageTransition from '@/components/ui-custom/PageTransition';

const InvoiceCreate = () => {
  const { clientId, jobId } = useParams<{ clientId?: string; jobId?: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (jobId) {
      setLoading(true);
      getJob(jobId)
        .then(fetchedJob => {
          if (fetchedJob) {
            setJob(fetchedJob);
          }
        })
        .catch(error => {
          console.error('Failed to fetch job:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [jobId]);

  if (!clientId && !jobId) {
    return <div className="container mx-auto py-8">Error: Client ID or Job ID is required</div>;
  }

  if (jobId && loading) {
    return <div className="container mx-auto py-8">Loading job data...</div>;
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Create Invoice</h1>
        {jobId && job ? (
          <InvoiceForm clientId={job.clientId} jobId={jobId} />
        ) : (
          <InvoiceForm clientId={clientId} />
        )}
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
