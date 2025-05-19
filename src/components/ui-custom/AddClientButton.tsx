
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

interface AddClientButtonProps {
  fullWidth?: boolean;
}

const AddClientButton: React.FC<AddClientButtonProps> = ({ fullWidth = false }) => {
  return (
    <Button 
      className={fullWidth ? 'w-full touch-manipulation' : ''} 
      size={fullWidth ? 'mobile' : 'default'}
      asChild
    >
      <Link to="/client/new">
        <UserPlus className="mr-2 h-4 w-4" />
        Add Client
      </Link>
    </Button>
  );
};

export default AddClientButton;
