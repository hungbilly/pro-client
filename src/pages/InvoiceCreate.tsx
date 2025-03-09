
import React from 'react';
import { useParams } from 'react-router-dom';
import InvoiceForm from '@/components/InvoiceForm';

const InvoiceCreate = () => {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) {
    return <div>Error: Client ID is required</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <InvoiceForm clientId={clientId} />
    </div>
  );
};

export default InvoiceCreate;
