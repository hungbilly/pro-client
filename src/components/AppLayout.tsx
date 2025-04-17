
import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';

const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col app-container">
      <TopNavbar />
      
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
