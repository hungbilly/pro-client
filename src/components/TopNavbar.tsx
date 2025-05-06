
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Briefcase, Settings, CreditCard, LogOut, Building, Menu, User, UserCog, FileText, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useCompany } from './CompanySelector';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import CompanySelector from './CompanySelector';
import { useIsMobile } from '@/hooks/use-mobile';
import UserProfileModal from './ui-custom/UserProfileModal';
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { SubscriptionStatusBadge } from './SubscriptionStatus';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  adminOnly?: boolean;
}

const TopNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    selectedCompany
  } = useCompany();
  const {
    signOut,
    user,
    isAdmin
  } = useAuth();
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
      window.localStorage.clear();
      window.sessionStorage.clear();
      setTimeout(() => {
        window.location.replace('/auth');
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
      setTimeout(() => {
        window.location.replace('/auth');
      }, 500);
    }
  };

  const menuItems: MenuItem[] = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />
    },
    {
      path: '/clients',
      label: 'Clients',
      icon: <Users className="w-5 h-5" />
    },
    {
      path: '/jobs',
      label: 'Jobs',
      icon: <Briefcase className="w-5 h-5" />
    },
    {
      path: '/invoices',
      label: 'Invoices',
      icon: <FileText className="w-5 h-5" />
    },
    {
      path: '/account',
      label: 'Account',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />
    },
    {
      path: '/admin',
      label: 'Admin',
      icon: <Shield className="w-5 h-5" />,
      adminOnly: true
    }
  ];

  const filterMenuItems = (items: MenuItem[]) => {
    return items.filter(item => !item.adminOnly || (item.adminOnly && isAdmin));
  };

  const renderMenuItems = () => {
    return filterMenuItems(menuItems).map(item => <Button key={item.path} variant="ghost" size="sm" asChild={!item.disabled} disabled={item.disabled} className={cn("flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors w-full justify-start", isActive(item.path) ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800", item.disabled && "opacity-50 cursor-not-allowed")}>
        {!item.disabled ? <Link to={item.path} className="flex items-center gap-2 w-full" onClick={() => isMobile && setIsDrawerOpen(false)}>
            {item.icon}
            <span>{item.label}</span>
          </Link> : <div className="flex items-center gap-2 w-full">
            {item.icon}
            <span>{item.label}</span>
          </div>}
      </Button>);
  };

  return <div className="w-full">
      <div className="bg-slate-900 w-full">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between w-full relative">
            <div className="flex items-center z-10">
              {isMobile && <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-slate-800">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="h-[80vh] bg-slate-900 border-t border-slate-800">
                    <div className="px-4 py-6 flex flex-col h-full">
                      <div className="flex justify-center mb-4">
                        <img src="/lovable-uploads/5f353837-9102-43b7-ab18-7950b403147a.png" alt="PRO CLIENT" className="h-14" />
                      </div>
                      <div className="space-y-1 flex-1">
                        {renderMenuItems()}
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-800">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <Button variant="ghost" size="sm" className="text-white hover:bg-slate-800 flex flex-col items-center w-full" onClick={() => {
                        setIsDrawerOpen(false);
                        setIsProfileModalOpen(true);
                      }}>
                            <div className="flex items-center justify-center w-full">
                              <UserCog className="w-4 h-4 mr-2" />
                              <span>Edit Profile</span>
                            </div>
                          </Button>
                          
                          <Button variant="ghost" size="sm" className="text-white hover:bg-slate-800 flex flex-col items-center w-full" onClick={() => {
                        setIsDrawerOpen(false);
                        handleLogout();
                      }}>
                            <div className="flex items-center justify-center w-full">
                              <LogOut className="w-4 h-4 mr-2" />
                              <span>Logout</span>
                            </div>
                            {user && <span className="text-xs text-slate-300 mt-1 truncate max-w-full">{user.email}</span>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>}
              <Link to="/" className="flex items-center mr-8">
                <img src="/lovable-uploads/5f353837-9102-43b7-ab18-7950b403147a.png" alt="PRO CLIENT" className="h-12" />
              </Link>
            </div>
            
            <nav className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2 space-x-1">
              {filterMenuItems(menuItems).map(item => <Button key={item.path} variant="ghost" size="sm" asChild={!item.disabled} disabled={item.disabled} className={cn("flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors", isActive(item.path) ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800", item.disabled && "opacity-50 cursor-not-allowed")}>
                  {!item.disabled ? <Link to={item.path} className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </Link> : <div className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>}
                </Button>)}
            </nav>
            
            <div className="flex items-center z-10">
              {/* Right-side empty div to balance the layout */}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800 w-full py-2">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="w-full md:w-auto">
              <CompanySelector className="w-full md:w-[300px]" showLabel={false} />
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              {user && <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-700 flex items-center gap-1 overflow-hidden" onClick={() => setIsProfileModalOpen(true)}>
                  <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs truncate">
                    {user.email}
                  </span>
                  <SubscriptionStatusBadge />
                </Button>}
              
              <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700 flex items-center gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {isProfileModalOpen && <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}
    </div>;
};

export default TopNavbar;
