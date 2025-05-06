
import React from 'react';
import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AddJobButtonProps {
  clientId?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const AddJobButton: React.FC<AddJobButtonProps> = ({ clientId, variant = "default", size = "default" }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (clientId) {
      navigate(`/client/${clientId}/job/create`);
    } else {
      navigate('/job/new');
    }
  };

  return (
    <Button onClick={handleClick} variant={variant} size={size} className="flex items-center gap-2">
      <Briefcase size={18} />
      <span>New Job</span>
    </Button>
  );
};

export default AddJobButton;
