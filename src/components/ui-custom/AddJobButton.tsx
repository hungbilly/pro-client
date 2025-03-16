
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';
import AddJobModal from './AddJobModal';

interface AddJobButtonProps {
  clientId?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const AddJobButton: React.FC<AddJobButtonProps> = ({ clientId, variant = "default", size = "default" }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <Button onClick={openModal} variant={variant} size={size} className="flex items-center gap-2">
        <Briefcase size={18} />
        <span>New Job</span>
      </Button>
      
      <AddJobModal isOpen={isModalOpen} onClose={closeModal} clientId={clientId} />
    </>
  );
};

export default AddJobButton;
