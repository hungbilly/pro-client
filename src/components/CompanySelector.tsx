import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyContext } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';

interface CompanySelectorProps {
  onCompanySelect?: (company: { id: string; name: string }) => void;
  className?: string;
  showLabel?: boolean;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({
  onCompanySelect,
  className,
  showLabel = true,
}) => {
  const { companies, selectedCompany, setSelectedCompany, loading } = useCompanyContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Debugging: Log companies and selectedCompany
  console.log('[CompanySelector] Render - Companies:', companies);
  console.log('[CompanySelector] Render - Selected Company:', selectedCompany);
  console.log('[CompanySelector] Render - Loading:', loading);

  // Debugging: Track changes to companies and selectedCompany
  useEffect(() => {
    console.log('[CompanySelector] Companies changed:', companies);
    console.log('[CompanySelector] Selected Company changed:', selectedCompany);
  }, [companies, selectedCompany]);

  const handleCompanyChange = (companyId: string) => {
    console.log('[CompanySelector] handleCompanyChange - Selected ID:', companyId);
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
      if (onCompanySelect) {
        onCompanySelect({ id: company.id, name: company.name });
      }
      navigate(`${location.pathname}?companyId=${companyId}`, { replace: true });
    } else {
      console.warn('[CompanySelector] Company not found for ID:', companyId);
    }
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center gap-1 mb-1 text-sm font-medium text-white">
          <Building className="h-4 w-4" />
          <span>Current Company</span>
        </div>
      )}
      <div className="flex items-center">
        {!showLabel && (
          <Building className="h-4 w-4 text-slate-400 mr-2" />
        )}
        <span className={`text-slate-300 mr-2 ${!showLabel ? '' : 'hidden'}`}>
          Current Company:
        </span>
        <Select
          value={selectedCompany?.id || ''}
          onValueChange={handleCompanyChange}
          disabled={loading || companies.length === 0}
        >
          <SelectTrigger
            className="w-full text-white border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            <SelectValue placeholder="Select a company">
              {selectedCompany?.name || 'Select a company'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name} {company.is_default && '(Default)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export { useCompanyContext as useCompany } from '@/context/CompanyContext';
export default CompanySelector;
