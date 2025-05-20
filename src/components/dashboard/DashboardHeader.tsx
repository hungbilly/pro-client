
import React from 'react';
import { Button } from '@/components/ui/button';
import AddClientButton from '../ui-custom/AddClientButton';
import OnboardingWelcome from '../ui-custom/OnboardingWelcome';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Shield, BookOpen } from 'lucide-react';

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
      <h1 className="text-3xl font-bold mb-3 md:mb-0 bg-gradient-to-r from-purple-700 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">Client Management</h1>
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          onClick={() => navigate('/tutorial')}
          className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/30"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Tutorial
        </Button>
        
        {isAdmin && (
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/30"
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={() => navigate('/subscription')}
          className="hidden md:flex bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-indigo-200 text-indigo-700 dark:from-indigo-900/30 dark:to-purple-900/30 dark:border-indigo-800/30 dark:text-indigo-300"
        >
          View Pricing
        </Button>
        <AddClientButton variant="secondary" />
      </div>
    </div>
  );
};

export default DashboardHeader;
