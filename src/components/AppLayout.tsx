
import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import MainNavbar from './MainNavbar';
import { 
  Menubar, 
  MenubarMenu, 
  MenubarTrigger, 
  MenubarContent, 
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut
} from './ui/menubar';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Briefcase, Wallet, Home } from 'lucide-react';

const AppLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar />
      
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto">
          <Menubar className="border-none shadow-none rounded-none">
            <MenubarMenu>
              <MenubarTrigger className="font-semibold">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => navigate('/')}>
                  Overview
                  <MenubarShortcut>⌘H</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            
            <MenubarMenu>
              <MenubarTrigger className="font-semibold">
                <Users className="h-4 w-4 mr-2" />
                Clients
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => navigate('/clients')}>
                  All Clients
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={() => navigate('/client/new')}>
                  New Client
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            
            <MenubarMenu>
              <MenubarTrigger className="font-semibold">
                <Briefcase className="h-4 w-4 mr-2" />
                Jobs
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => navigate('/jobs')}>
                  All Jobs
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={() => navigate('/job/new')}>
                  New Job
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            
            <MenubarMenu>
              <MenubarTrigger className="font-semibold">
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => navigate('/invoices')}>
                  All Invoices
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            
            <MenubarMenu>
              <MenubarTrigger className="font-semibold">
                <Wallet className="h-4 w-4 mr-2" />
                Payments
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => navigate('/payments')}>
                  View Payments
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
      </div>
      
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
