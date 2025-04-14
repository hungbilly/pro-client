
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import TopNavbar from './TopNavbar';

const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar />
      
      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="bg-slate-900 text-slate-300 py-6">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p>&copy; {new Date().getFullYear()} Pro Client. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
