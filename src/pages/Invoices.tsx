
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/lib/storage';
import { useCompany } from '@/components/CompanySelector';

const Invoices = () => {
  const { selectedCompany } = useCompany();

  // Updated query to handle the case when selectedCompany?.id is undefined
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      return await getInvoices(selectedCompany.id);
    },
    enabled: !!selectedCompany?.id,
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
              {invoices.map(invoice => (
                <div key={invoice.id} className="border p-4 rounded">
                  <p>Invoice #{invoice.number}</p>
                  <p>Amount: ${invoice.amount}</p>
                  <p>Status: {invoice.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Invoices;
