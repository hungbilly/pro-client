
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClient } from '@/lib/storage';
import { Client } from '@/types';
import ClientForm from '@/components/ClientForm';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';

const ClientEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error('Client ID is missing.');
      navigate('/');
      return;
    }

    const fetchClient = async () => {
      setIsLoading(true);
      try {
        const fetchedClient = await getClient(id);
        if (fetchedClient) {
          setClient(fetchedClient);
        } else {
          toast.error('Client not found.');
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch client:', error);
        toast.error('Failed to load client data.');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Loading client data...</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!client) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center p-8">Client not found.</div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Edit Client</h1>
        <ClientForm existingClient={client} />
      </div>
    </PageTransition>
  );
};

export default ClientEdit;
