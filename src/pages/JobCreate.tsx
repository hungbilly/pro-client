
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JobForm from '@/components/JobForm';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';

const JobCreate = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  if (!clientId) {
    toast.error('Client ID is required to create a job');
    navigate('/');
    return null;
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Create New Job</h1>
        <JobForm clientId={clientId} />
      </div>
    </PageTransition>
  );
};

export default JobCreate;
