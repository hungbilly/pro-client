
import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, Users, Calendar, Palette } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AdminLayout = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-purple-900 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            <Link to="/admin" className="text-xl font-bold">Admin Portal</Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/admin" 
              className={`text-sm ${isActive('/admin') ? 'font-semibold border-b-2 border-white pb-1' : 'opacity-90 hover:opacity-100'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/admin/themes" 
              className={`text-sm ${isActive('/admin/themes') ? 'font-semibold border-b-2 border-white pb-1' : 'opacity-90 hover:opacity-100'}`}
            >
              Themes
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm hidden md:inline">
                {user.email}
              </span>
            )}
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-purple-800">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <div className="md:hidden bg-purple-800 text-white px-4 py-2">
        <div className="flex justify-between space-x-2">
          <Link 
            to="/admin" 
            className={`flex flex-col items-center py-1 px-3 ${isActive('/admin') ? 'bg-purple-700 rounded' : ''}`}
          >
            <Users className="h-5 w-5 mb-1" />
            <span className="text-xs">Dashboard</span>
          </Link>
          <Link 
            to="/admin/themes" 
            className={`flex flex-col items-center py-1 px-3 ${isActive('/admin/themes') ? 'bg-purple-700 rounded' : ''}`}
          >
            <Palette className="h-5 w-5 mb-1" />
            <span className="text-xs">Themes</span>
          </Link>
        </div>
      </div>
      
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
      
      <footer className="bg-purple-900 text-white py-4 text-center text-sm">
        <div className="container mx-auto">
          Admin Portal - Restricted Access
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
