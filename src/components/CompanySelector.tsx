
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyContext } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';

interface CompanySelectorProps {
  onCompanySelect?: (company: { id: string, name: string }) => void;
  className?: string;
  showLabel?: boolean;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ 
  onCompanySelect, 
  className, 
  showLabel = true 
}) => {
  const { companies, selectedCompanyId, setSelectedCompanyId, loading } = useCompanyContext();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCompanyChange = (value: string) => {
    console.log(`[CompanySelector] Company selection changed:`, {
      previousId: selectedCompanyId,
      newId: value,
      availableCompanies: companies.map(c => ({ id: c.id, name: c.name }))
    });

    setSelectedCompanyId(value);
    
    const company = companies.find(c => c.id === value);
    if (company && onCompanySelect) {
      console.log('[CompanySelector] Calling onCompanySelect with:', {
        id: company.id,
        name: company.name
      });
      onCompanySelect({ id: company.id, name: company.name });
    }
    
    // Only redirect to dashboard if not on /settings page
    const currentPath = location.pathname;
    console.log(`[CompanySelector] Current path:`, currentPath);
    
    if (currentPath !== '/' && currentPath !== '/settings') {
      console.log(`[CompanySelector] Navigating to dashboard`);
      navigate('/');
    } else {
      console.log('[CompanySelector] Staying on current page:', currentPath);
    }
  };

  console.log(`[CompanySelector] Rendering:`, {
    loading,
    companiesCount: companies.length,
    selectedCompanyId,
    currentPath: location.pathname
  });

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading companies...</div>;
  }

  if (companies.length === 0) {
    return (
      <div className={cn("text-sm", className)}>
        No companies found. Please add a company in Settings.
      </div>
    );
  }

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
          value={selectedCompanyId || ''}
          onValueChange={handleCompanyChange}
          disabled={companies.length === 0}
        >
          <SelectTrigger 
            className="w-full text-white border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            <SelectValue placeholder="Select a company" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            {companies.map(company => (
              <SelectItem key={company.id} value={company.id}>
                {company.name} {company.is_default && "(Default)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CompanySelector;
