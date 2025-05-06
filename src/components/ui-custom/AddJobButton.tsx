
import React from 'react';
import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AddJobModal from './AddJobModal';

interface AddJobButtonProps {
  clientId?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const AddJobButton: React.FC<AddJobButtonProps> = ({ clientId, variant = "default", size = "default" }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (clientId) {
      // With a client ID, navigate directly to client job creation
      navigate(`/client/${clientId}/job/create`);
    } else {
      // Without a client ID, open the modal to select a client first
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <Button onClick={handleClick} variant={variant} size={size} className="flex items-center gap-2">
        <Briefcase size={18} />
        <span>New Job</span>
      </Button>

      <AddJobModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default AddJobButton;
