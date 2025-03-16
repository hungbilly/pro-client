
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JobForm from '@/components/JobForm';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import CompanySelector from '@/components/CompanySelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const JobCreate = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  if (!clientId) {
    toast.error('Client ID is required to create a job');
    navigate('/');
    return null;
  }

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Create New Job</h1>
        
        <Card className="mb-8 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Select Company</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanySelector onCompanySelect={handleCompanySelect} />
          </CardContent>
        </Card>
        
        <JobForm clientId={clientId} companyId={selectedCompanyId} />
      </div>
    </PageTransition>
  );
};

export default JobCreate;
