
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

interface AddJobButtonProps {
  clientId?: string;
  fullWidth?: boolean;
}

const AddJobButton: React.FC<AddJobButtonProps> = ({ clientId, fullWidth = false }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (clientId) {
      navigate(`/client/${clientId}/job/create`);
    } else {
      navigate('/job/create');
    }
  };

  return (
    <Button 
      onClick={handleClick} 
      className={fullWidth ? 'w-full touch-manipulation' : ''}
      size={fullWidth ? 'mobile' : 'default'}
    >
      <Briefcase className="mr-2 h-4 w-4" />
      Add Job
    </Button>
  );
};

export default AddJobButton;
