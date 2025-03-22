
import React from 'react';
import Dashboard from '@/components/Dashboard';
import PageTransition from '@/components/ui-custom/PageTransition';
import { ErrorBoundary } from 'react-error-boundary';

const Index = () => {
  return (
    <PageTransition>
      <ErrorBoundary 
        fallback={
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="mb-4">There was an error loading the dashboard. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        }
      >
        <Dashboard />
      </ErrorBoundary>
    </PageTransition>
  );
};

export default Index;
