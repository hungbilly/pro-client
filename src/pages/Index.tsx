
import React from 'react';
import Dashboard from '@/components/Dashboard';
import PageTransition from '@/components/ui-custom/PageTransition';
import AdminHeader from '@/components/AdminHeader';

const Index = () => {
  return (
    <>
      <AdminHeader />
      <PageTransition>
        <Dashboard />
      </PageTransition>
    </>
  );
};

export default Index;
