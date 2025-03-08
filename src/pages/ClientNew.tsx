
import React from 'react';
import ClientForm from '@/components/ClientForm';
import PageTransition from '@/components/ui-custom/PageTransition';

const ClientNew = () => {
  return (
    <PageTransition>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Add New Client</h1>
        <ClientForm />
      </div>
    </PageTransition>
  );
};

export default ClientNew;
