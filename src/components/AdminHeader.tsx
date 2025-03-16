
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Building2, 
  CreditCard, 
  LogOut, 
  Menu, 
  User, 
  Users,
  Settings
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const AdminHeader = () => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">Wedding Studio Manager</Link>
        
        <nav className="hidden md:flex space-x-6">
          <Link to="/" className="hover:text-blue-200 transition-colors">Dashboard</Link>
          <Link to="/settings" className="hover:text-blue-200 transition-colors">Settings</Link>
        </nav>
        
        <div className="flex items-center gap-2">
          {user && (
            <span className="hidden md:inline text-sm mr-2">
              {user.email}
            </span>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/clients" className="cursor-pointer w-full flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Clients</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer w-full flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
