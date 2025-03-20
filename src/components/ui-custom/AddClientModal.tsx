
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ClientForm from '@/components/ClientForm';
import { useQueryClient } from '@tanstack/react-query';
import { useCompanyContext } from '@/context/CompanyContext';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompanyContext();
  
  const handleSuccess = () => {
    // Invalidate and refetch clients query to update the list
    queryClient.invalidateQueries({ queryKey: ['clients', selectedCompany?.id] });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>Enter client details to add them to your system</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <ClientForm existingClient={undefined} onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientModal;
