
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Briefcase, 
  Calendar, 
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const TopNavbar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { path: '/clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
    { path: '/jobs', label: 'Jobs', icon: <Briefcase className="w-5 h-5" /> },
    { path: '/calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" />, disabled: true },
    { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="bg-slate-900 text-white py-2 px-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center text-xl font-bold mr-8">
            <span>Wedding Studio Manager</span>
          </Link>
          <nav className="hidden md:flex space-x-1">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                asChild={!item.disabled}
                disabled={item.disabled}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                  isActive(item.path)
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {!item.disabled ? (
                  <Link to={item.path} className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                )}
              </Button>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="text-white border-slate-700 hover:bg-slate-800">
            <span className="hidden md:inline-block">Billy ONAIR Photography</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;
