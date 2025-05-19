
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

interface AddClientButtonProps {
  fullWidth?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'mobile';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

const AddClientButton: React.FC<AddClientButtonProps> = ({ 
  fullWidth = false,
  size = 'default',
  variant = 'default'
}) => {
  return (
    <Button 
      className={fullWidth ? 'w-full touch-manipulation' : ''} 
      size={fullWidth ? 'mobile' : size}
      variant={variant}
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
