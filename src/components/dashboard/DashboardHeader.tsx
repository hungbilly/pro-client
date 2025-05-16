
import React from 'react';
import { Button } from '@/components/ui/button';
import AddClientButton from '../ui-custom/AddClientButton';

interface DashboardHeaderProps {
  hasCompanies: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ hasCompanies }) => {
  if (!hasCompanies) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4">Welcome to Wedding Studio Manager</h2>
          <p className="mb-6 text-red-500">To get started, you need to create a company first. please refresh the page if you don't see the new company after added</p>
          <Button asChild>
            <a href="/settings">Create Your Company</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <h1 className="text-3xl font-bold mb-3 md:mb-0">Client Management</h1>
      <div className="flex flex-wrap gap-2">
        <AddClientButton />
      </div>
    </div>
  );
};

export default DashboardHeader;
