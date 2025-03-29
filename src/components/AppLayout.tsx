
import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const AppLayout = () => {
  const { isAdmin } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar />
      
      {isAdmin && (
        <div className="bg-amber-50 text-amber-800 py-2 px-4 text-center text-sm">
          <Link to="/admin" className="flex items-center justify-center gap-1 hover:underline">
            <ShieldCheck size={16} />
            Admin Dashboard Available
          </Link>
        </div>
      )}
      
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
