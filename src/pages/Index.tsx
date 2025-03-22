
import React from 'react';
import Dashboard from '@/components/Dashboard';
import PageTransition from '@/components/ui-custom/PageTransition';
import { ErrorBoundary } from 'react-error-boundary';

const Index = () => {
  return (
    <PageTransition>
      <ErrorBoundary fallback={<div className="p-8">Something went wrong loading the dashboard.</div>}>
        <Dashboard />
      </ErrorBoundary>
    </PageTransition>
  );
};

export default Index;
