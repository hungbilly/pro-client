
import React from 'react';
import Dashboard from '@/components/Dashboard';
import PageTransition from '@/components/ui-custom/PageTransition';
import { CompanyProvider } from '@/components/CompanySelector';

const Index = () => {
  return (
    <PageTransition>
      <CompanyProvider>
        <Dashboard />
      </CompanyProvider>
    </PageTransition>
  );
};

export default Index;
