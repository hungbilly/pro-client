
import React from 'react';
import Dashboard from '@/components/Dashboard';
import PageTransition from '@/components/ui-custom/PageTransition';
import { isDemoMode } from '@/lib/storage';

const Index = () => {
  console.log('Rendering Index page, demo mode:', isDemoMode());
  
  return (
    <PageTransition>
      {isDemoMode() ? (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Welcome to Wedding Client Manager</h1>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
              <p className="text-amber-700">
                <strong>Environment Setup Required</strong>
              </p>
              <p className="mt-2 text-sm">
                This application requires Supabase configuration to function properly. Please set the following environment variables:
              </p>
              <ul className="list-disc pl-5 mt-2 text-sm">
                <li><code>VITE_SUPABASE_URL</code></li>
                <li><code>VITE_SUPABASE_ANON_KEY</code></li>
              </ul>
            </div>
            <p className="mb-4">
              Once configured, you'll be able to:
            </p>
            <ul className="list-disc pl-5 mb-6">
              <li>Manage client information</li>
              <li>Track photography jobs</li>
              <li>Create and send invoices</li>
              <li>Organize your wedding photography business</li>
            </ul>
            <p className="text-sm text-gray-600">
              Please check your <code>.env</code> file or environment configuration to set up these variables.
            </p>
          </div>
        </div>
      ) : (
        <Dashboard />
      )}
    </PageTransition>
  );
};

export default Index;
