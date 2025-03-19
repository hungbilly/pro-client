
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Briefcase, 
  Settings,
  Wallet,
  LogOut,
  Building,
  Menu,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useCompany } from './CompanySelector';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import CompanySelector from './CompanySelector';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

// Define the proper type for menu items
interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const TopNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      console.log('TopNavbar: Initiating logout');
      await signOut();
      console.log('TopNavbar: Logout successful');
      toast.success('Logged out successfully');
      
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

  const menuItems: MenuItem[] = [
    { path: '/', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { path: '/clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
    { path: '/jobs', label: 'Jobs', icon: <Briefcase className="w-5 h-5" /> },
    { path: '/payments', label: 'Payments', icon: <Wallet className="w-5 h-5" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const renderMenuItems = () => {
    return menuItems.map((item) => (
      <Button
        key={item.path}
        variant="ghost"
        size="sm"
        asChild={!item.disabled}
        disabled={item.disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors w-full justify-start",
          isActive(item.path)
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:text-white hover:bg-slate-800",
          item.disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {!item.disabled ? (
          <Link to={item.path} className="flex items-center gap-2 w-full">
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 w-full">
            {item.icon}
            <span>{item.label}</span>
          </div>
        )}
      </Button>
    ));
  };

  return (
    <div className="w-full">
      {/* Main navigation - dark background */}
      <div className="bg-slate-900 w-full">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          {/* Top section: Logo and main navigation */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {isMobile && (
                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="mr-2 text-white hover:bg-slate-800"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="h-[80vh] bg-slate-900 border-t border-slate-800">
                    <div className="px-4 py-6 flex flex-col h-full">
                      <div className="text-xl font-bold text-white mb-4">Wedding Studio Manager</div>
                      <div className="space-y-1 flex-1">
                        {renderMenuItems()}
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-800">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-white hover:bg-slate-800 flex flex-col items-center w-full"
                            onClick={handleLogout}
                          >
                            <div className="flex items-center justify-center w-full">
                              <LogOut className="w-4 h-4 mr-2" />
                              <span>Logout</span>
                            </div>
                            {user && (
                              <span className="text-xs text-slate-300 mt-1 truncate max-w-full">{user.email}</span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              )}
              <Link to="/" className="flex items-center text-xl font-bold text-white mr-8">
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
                      "flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors",
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
            
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-slate-800 flex items-center gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline-block">Logout</span>
              </Button>
              {user && (
                <div className="hidden md:flex items-center ml-3 max-w-[140px]">
                  <User className="h-4 w-4 text-slate-400 mr-1 flex-shrink-0" />
                  <span className="text-xs text-slate-300 truncate">
                    {user.email}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Company selector - different background color */}
      <div className="bg-slate-800 w-full py-2">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center">
            <div className="w-full md:w-auto">
              <CompanySelector className="w-full md:w-[300px]" showLabel={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;
