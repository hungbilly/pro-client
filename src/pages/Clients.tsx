
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import ClientCard from '@/components/ClientCard';
import AddClientModal from '@/components/ui-custom/AddClientModal';
import PageTransition from '@/components/ui-custom/PageTransition';
import { Client } from '@/types';
import { getClients } from '@/lib/storage';

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

  // Fetch clients data
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        return await getClients();
      } catch (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
    },
  });

  // Filter clients based on search query
  const filteredClients = clients.filter((client: Client) => {
    return client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           client.phone?.includes(searchQuery);
  });

  const handleClientClick = (clientId: string) => {
    navigate(`/client/${clientId}`);
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">Clients</h1>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button onClick={() => setIsAddClientModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-48 p-6"></CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading clients. Please try again.</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No clients found. Add your first client to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client: Client) => (
              <div key={client.id} onClick={() => handleClientClick(client.id)} className="cursor-pointer">
                <ClientCard client={client} />
              </div>
            ))}
          </div>
        )}

        <AddClientModal 
          isOpen={isAddClientModalOpen} 
          onClose={() => setIsAddClientModalOpen(false)} 
        />
      </div>
    </PageTransition>
  );
};

export default Clients;
