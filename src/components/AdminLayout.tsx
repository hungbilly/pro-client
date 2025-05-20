
import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AdminLayout = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  // Don't render anything if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-purple-950">
      <header className="bg-gradient-to-r from-purple-800 to-indigo-800 dark:from-purple-900 dark:to-indigo-900 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Shield className="h-6 w-6 mr-2 text-purple-200" />
            <Link to="/admin" className="text-xl font-bold text-white">Admin Portal</Link>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm hidden md:inline text-purple-200">
                {user.email}
              </span>
            )}
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <Outlet />
      </main>
      
      <footer className="bg-gradient-to-r from-purple-800 to-indigo-800 dark:from-purple-900 dark:to-indigo-900 text-white py-4 text-center text-sm">
        <div className="container mx-auto">
          Admin Portal - Restricted Access
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
