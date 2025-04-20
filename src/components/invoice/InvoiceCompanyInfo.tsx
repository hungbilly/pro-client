
import React from 'react';
import { Building } from 'lucide-react';
import { CompanyClientView, Company } from '@/types';

interface InvoiceCompanyInfoProps {
  company: Company | CompanyClientView | null;
}

const InvoiceCompanyInfo: React.FC<InvoiceCompanyInfoProps> = ({ company }) => {
  if (!company) return null;

  return (
    <div className="flex flex-col justify-between">
      <div className="flex items-start mb-6 h-80">
        {company.logo_url ? (
          <img 
            src={company.logo_url} 
            alt={`${company.name} Logo`}
            className="h-full max-h-80 w-auto object-contain" 
          />
        ) : (
          <div className="h-24 w-24 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-gray-400">
            <Building className="h-14 w-14" />
          </div>
        )}
      </div>
      
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">INVOICE</div>
        <div className="text-2xl font-bold"># {company.name}</div>
        {company.email && <div className="text-sm">{company.email}</div>}
        {company.phone && <div className="text-sm">{company.phone}</div>}
        {company.address && <div className="text-sm">{company.address}</div>}
      </div>
    </div>
  );
};

export default InvoiceCompanyInfo;
