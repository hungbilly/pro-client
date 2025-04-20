
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/lib/storage';
import { useCompany } from '@/components/CompanySelector';

const Invoices = () => {
  const { selectedCompanyId } = useCompany();

  // When importing getInvoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => getInvoices(),
    enabled: !!selectedCompanyId,
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Invoices</h1>
      
      {isLoading ? (
        <div className="text-center py-8">Loading invoices...</div>
      ) : (
        <div>
          {/* Invoice list rendering */}
          {invoices.length === 0 ? (
            <div className="text-center py-8">No invoices found.</div>
          ) : (
            <div className="grid gap-4">
              {/* Render invoice list here */}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Invoices;
