
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JobForm from '@/components/JobForm';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import ClientSelector from '@/components/ClientSelector';
import { Card, CardContent } from '@/components/ui/card';

const JobCreate = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleJobSuccess = () => {
    if (selectedClientId) {
      navigate(`/client/${selectedClientId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Create New Job</h1>
        
        <div className="mb-8 max-w-4xl mx-auto">
          {!clientId && (
            <ClientSelector
              selectedClientId={selectedClientId || undefined}
              onClientSelect={handleClientSelect}
              className="mb-6"
            />
          )}
        </div>
        
        {(selectedClientId || clientId) ? (
          <JobForm 
            clientId={selectedClientId || clientId || ''} 
            onSuccess={handleJobSuccess}
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
