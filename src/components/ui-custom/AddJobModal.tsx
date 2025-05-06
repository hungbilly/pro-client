
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import JobForm from '@/components/JobForm';
import ClientSelector from '@/components/ClientSelector';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { getClient } from '@/lib/storage';
import { Client } from '@/types';
import { User, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
}

const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, clientId: initialClientId }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClient = async () => {
      if (selectedClientId) {
        try {
          const clientData = await getClient(selectedClientId);
          setClient(clientData);
        } catch (error) {
          console.error('Failed to fetch client:', error);
        }
      }
    };

    if (selectedClientId) {
      fetchClient();
    } else {
      setClient(null);
    }
  }, [selectedClientId]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleJobSuccess = (jobId: string) => {
    setIsSubmitting(false);
    onClose();
    
    if (!jobId) {
      console.error('No job ID was returned after job creation');
      toast.error('An error occurred while creating the job');
      return;
    }
    
    // Navigate to the job details page
    navigate(`/job/${jobId}`);
  };

  // Prevent closing the modal during submission
  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting && !open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>Add a new job for your selected client</DialogDescription>
        </DialogHeader>
        
        <div className="py-2 space-y-4">
          {!initialClientId && (
            <ClientSelector
              selectedClientId={selectedClientId || undefined}
              onClientSelect={handleClientSelect}
            />
          )}
          
          {/* Client Information Card */}
          {client && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <h2 className="font-semibold mb-2">Client</h2>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{client.name}</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4" />
                    <span>{client.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {selectedClientId ? (
            <JobForm 
              clientId={selectedClientId} 
              onSuccess={handleJobSuccess}
            />
          ) : (
            <Card>
              <CardContent className="py-4">
                <p className="text-center text-muted-foreground">Please select a client to continue</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddJobModal;
