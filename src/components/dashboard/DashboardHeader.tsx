
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
    <div className="glass-panel-enhanced backdrop-blur-xl bg-white/25 border-white/40 rounded-2xl p-6 mb-8 shadow-glass-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold mb-3 md:mb-0 text-gray-900 drop-shadow-sm">Client Management</h1>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/tutorial')}
            className="glass-button-enhanced bg-white/30 border-white/50 text-blue-800 hover:bg-white/40 hover:border-white/70 backdrop-blur-md font-medium shadow-glass"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Tutorial
          </Button>
          
          {isAdmin && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin')}
              className="glass-button-enhanced bg-white/30 border-white/50 text-purple-800 hover:bg-white/40 hover:border-white/70 backdrop-blur-md font-medium shadow-glass"
            >
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => navigate('/subscription')}
            className="hidden md:flex glass-button-enhanced bg-white/30 border-white/50 text-gray-800 hover:bg-white/40 hover:border-white/70 backdrop-blur-md font-medium shadow-glass"
          >
            View Pricing
          </Button>
          <AddClientButton />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
