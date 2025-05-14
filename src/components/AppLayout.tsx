
import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import Footer from './Footer';
import MainNavbar from './MainNavbar';

const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar />
      <MainNavbar />
      
      <div className="flex-1">
        <Outlet />
      </div>
      
      <Footer />
    </div>
  );
};

export default AppLayout;
