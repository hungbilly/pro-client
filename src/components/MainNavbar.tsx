
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Target, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MainNavbar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { path: '/client', label: 'Clients', icon: <Users className="w-5 h-5" /> },
    // Comment out Leads section for now as it doesn't exist in the app yet
    // { path: '/leads', label: 'Leads', icon: <Target className="w-5 h-5" /> },
    { path: '/job', label: 'Jobs', icon: <Briefcase className="w-5 h-5" /> },
    // Comment out Calendar section for now as it doesn't exist in the app yet
    // { path: '/calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
    // Comment out Payments section for now as it doesn't exist in the app yet
    // { path: '/payments', label: 'Payments', icon: <DollarSign className="w-5 h-5" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="py-4 text-xl font-bold text-gray-800">
            Wedding Studio Manager
          </Link>
          
          <div className="flex space-x-1 md:space-x-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center px-2 py-3 text-xs md:text-sm transition-colors",
                  isActive(item.path)
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-blue-500"
                )}
              >
                <div className="mb-1">{item.icon}</div>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNavbar;
