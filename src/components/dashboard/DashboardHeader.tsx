
import React from 'react';
import { Button } from '@/components/ui/button';
import AddClientButton from '../ui-custom/AddClientButton';
import OnboardingWelcome from '../ui-custom/OnboardingWelcome';

interface DashboardHeaderProps {
  hasCompanies: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ hasCompanies }) => {
  if (!hasCompanies) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-130px)]">
        <OnboardingWelcome />
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
