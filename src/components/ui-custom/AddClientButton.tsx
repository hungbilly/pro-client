
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import AddClientModal from './AddClientModal';

const AddClientButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <Button onClick={openModal} className="flex items-center gap-2">
        <PlusCircle size={18} />
        <span>Add Client</span>
      </Button>
      
      <AddClientModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};

export default AddClientButton;
