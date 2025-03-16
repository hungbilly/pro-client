
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JobForm from '@/components/JobForm';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import CompanySelector from '@/components/CompanySelector';
import ClientSelector from '@/components/ClientSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const JobCreate = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null);

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Create New Job</h1>
        
        <Card className="mb-8 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!clientId && (
              <ClientSelector
                selectedClientId={selectedClientId || undefined}
                onClientSelect={handleClientSelect}
              />
            )}
            
            <CompanySelector 
              className="mt-4" 
              onCompanySelect={handleCompanySelect} 
            />
          </CardContent>
        </Card>
        
        {(selectedClientId || clientId) ? (
          <JobForm 
            clientId={selectedClientId || clientId || ''} 
            companyId={selectedCompanyId} 
          />
        ) : (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="py-6">
              <p className="text-center text-muted-foreground">Please select a client to continue</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
};

export default JobCreate;
