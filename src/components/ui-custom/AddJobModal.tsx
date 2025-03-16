
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import CompanySelector from '@/components/CompanySelector';
import ClientSelector from '@/components/ClientSelector';
import JobForm from '@/components/JobForm';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleSuccess = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Job</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <ClientSelector
            selectedClientId={selectedClientId || undefined}
            onClientSelect={handleClientSelect}
          />
          
          <CompanySelector 
            className="mt-4" 
            onCompanySelect={handleCompanySelect} 
          />
          
          {selectedClientId && (
            <JobForm 
              clientId={selectedClientId}
              companyId={selectedCompanyId}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddJobModal;
