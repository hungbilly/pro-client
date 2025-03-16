
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getClients } from '@/lib/storage';
import { PlusCircle } from 'lucide-react';

interface ClientSelectorProps {
  selectedClientId?: string;
  onClientSelect: (clientId: string) => void;
  className?: string;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  selectedClientId, 
  onClientSelect,
  className
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const allClients = await getClients();
        setClients(allClients);
        
        if (selectedClientId) {
          const client = allClients.find(c => c.id === selectedClientId);
          if (client) {
            setSelectedClient(client);
          }
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [selectedClientId]);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(false);
    onClientSelect(client.id);
  };

  const handleCreateNewClient = () => {
    navigate('/client/new');
  };

  return (
    <div className={className}>
      <Label htmlFor="client" className="text-base font-medium">Primary Client Contact</Label>
      <div className="flex items-center gap-3 mt-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Input
              id="client"
              className="flex-1"
              value={selectedClient ? `${selectedClient.name} (${selectedClient.email})` : ''}
              placeholder="Select a client"
              readOnly
            />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select a client</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {loading ? (
                <p>Loading clients...</p>
              ) : clients.length === 0 ? (
                <p>No clients found. Create your first client.</p>
              ) : (
                <div className="max-h-[300px] overflow-auto">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => handleClientClick(client)}
                    >
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <span className="text-gray-500">OR</span>
        <Button 
          variant="secondary" 
          className="flex items-center gap-1" 
          onClick={handleCreateNewClient}
        >
          <PlusCircle className="h-4 w-4" />
          Add new client
        </Button>
      </div>
    </div>
  );
};

export default ClientSelector;
