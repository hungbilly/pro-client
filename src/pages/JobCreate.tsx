
import React from 'react';
import { useParams } from 'react-router-dom';
import JobForm from '@/components/JobForm';
import PageTransition from '@/components/ui-custom/PageTransition';

const JobCreate = () => {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) {
    return <div>Error: Client ID is required</div>;
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
