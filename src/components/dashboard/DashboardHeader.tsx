
import React from 'react';
import { Button } from '@/components/ui/button';
import AddClientButton from '../ui-custom/AddClientButton';
import OnboardingWelcome from '../ui-custom/OnboardingWelcome';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Shield } from 'lucide-react';

interface DashboardHeaderProps {
  hasCompanies: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ hasCompanies }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
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
        {isAdmin && (
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={() => navigate('/subscription')}
          className="hidden md:flex"
        >
          View Pricing
        </Button>
        <AddClientButton />
      </div>
    </div>
  );
};

export default DashboardHeader;
