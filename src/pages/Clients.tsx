
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import AddClientModal from '@/components/ui-custom/AddClientModal';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ClientCard from '@/components/ClientCard';
import { useQuery } from '@tanstack/react-query';
import { getClients } from '@/lib/storage';

const Clients = () => {
  const navigate = useNavigate();
  const [clientModalOpen, setClientModalOpen] = useState(false);
  
  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const handleAddClient = () => {
    setClientModalOpen(true);
  };

  const handleClientAdded = () => {
    setClientModalOpen(false);
    refetch();
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Clients</h1>
          <Button onClick={handleAddClient} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add New Client
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p>Loading clients...</p>
            </CardContent>
          </Card>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="mb-4">No clients found.</p>
              <Button onClick={handleAddClient} variant="outline">Add Your First Client</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <ClientCard 
                key={client.id} 
                client={client} 
                onClick={() => navigate(`/client/${client.id}`)} 
              />
            ))}
          </div>
        )}

        <AddClientModal isOpen={clientModalOpen} onClose={handleClientAdded} />
      </div>
    </PageTransition>
  );
};

export default Clients;
