
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const AddClientButton = () => {
  return (
    <Link to="/client/new">
      <Button className="flex items-center gap-2">
        <PlusCircle size={18} />
        <span>Add Client</span>
      </Button>
    </Link>
  );
};

export default AddClientButton;
