
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import CompanySelector from './CompanySelector';
import { SubscriptionStatusBadge } from './SubscriptionStatus';

const MainNavbar = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  
  const handleLogout = async () => {
    try {
      console.log('MainNavbar: Initiating logout');
      await signOut();
      console.log('MainNavbar: Logout successful');
      toast.success('Successfully logged out');
      
      // Force a hard reload to the auth page to clear all state
      window.localStorage.clear();
      window.sessionStorage.clear();
      setTimeout(() => {
        window.location.replace('/auth');
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
      
      // Even if logout fails, redirect to auth page as a fallback
      setTimeout(() => {
        window.location.replace('/auth');
      }, 500);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm py-2 w-full sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center w-full">
          <div className="flex-1 min-w-0">
            <CompanySelector className="max-w-xs lg:max-w-md" showLabel={true} />
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {user && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 hidden sm:inline truncate max-w-[150px] lg:max-w-none">
                  {user.email}
                </span>
                <SubscriptionStatusBadge />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="flex items-center gap-1 flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNavbar;
