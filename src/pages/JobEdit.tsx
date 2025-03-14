
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob } from '@/lib/storage';
import { Job } from '@/types';
import JobForm from '@/components/JobForm';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';

const JobEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error('Job ID is missing.');
      navigate('/');
      return;
    }

    const fetchJob = async () => {
      setIsLoading(true);
      try {
        const fetchedJob = await getJob(id);
        if (fetchedJob) {
          setJob(fetchedJob);
        } else {
          toast.error('Job not found.');
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch job:', error);
        toast.error('Failed to load job data.');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Loading job data...</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!job) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Job not found.</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Edit Job</h1>
        <JobForm job={job} />
      </div>
    </PageTransition>
  );
};

export default JobEdit;
