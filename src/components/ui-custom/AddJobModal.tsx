
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import JobForm from '@/components/JobForm';
import ClientSelector from '@/components/ClientSelector';
import CompanySelector from '@/components/CompanySelector';
import { Card, CardContent } from '@/components/ui/card';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
}

const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, clientId: initialClientId }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
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
          
          <CompanySelector 
            onCompanySelect={handleCompanySelect} 
          />
          
          {selectedClientId ? (
            <JobForm 
              clientId={selectedClientId} 
              companyId={selectedCompanyId || undefined}
              onSuccess={onClose}
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
