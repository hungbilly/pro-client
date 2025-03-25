
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getClients } from '@/lib/storage';
import { PlusCircle, UserSearch } from 'lucide-react';
import AddClientModal from '@/components/ui-custom/AddClientModal';
import { useCompany } from './CompanySelector';

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
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const navigate = useNavigate();
  
  // Get the selected company from context
  const { selectedCompanyId } = useCompany();
  
  console.log("ClientSelector: selectedCompanyId =", selectedCompanyId);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        console.log("Fetching clients for company:", selectedCompanyId);
        const allClients = await getClients(selectedCompanyId);
        console.log("Fetched clients:", allClients.length);
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
  }, [selectedClientId, clientModalOpen, selectedCompanyId]);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(false);
    onClientSelect(client.id);
  };

  const handleCreateNewClient = () => {
    setClientModalOpen(true);
  };

  const handleClientAdded = async () => {
    setClientModalOpen(false);
    // Refresh clients list
    try {
      const allClients = await getClients(selectedCompanyId);
      setClients(allClients);
    } catch (error) {
      console.error('Error refreshing clients:', error);
    }
  };

  return (
    <div className={className}>
      <Label htmlFor="client" className="text-base font-medium">Primary Client Contact</Label>
      <div className="flex items-center gap-3 mt-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 justify-start text-left font-normal h-10 px-3 relative"
            >
              {selectedClient ? (
                `${selectedClient.name} (${selectedClient.email})`
              ) : (
                <span className="flex items-center text-muted-foreground">
                  <UserSearch className="mr-2 h-4 w-4" />
                  Choose existing client
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Choose existing client</DialogTitle>
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
      
      <AddClientModal isOpen={clientModalOpen} onClose={handleClientAdded} />
    </div>
  );
};

export default ClientSelector;
