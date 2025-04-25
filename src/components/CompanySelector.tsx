
import React, { useEffect, useId, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyContext } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';

export const useCompany = () => {
  const { 
    selectedCompany, 
    selectedCompanyId, 
    companies, 
    loading, 
    setSelectedCompany 
  } = useCompanyContext();

  return { 
    selectedCompany, 
    selectedCompanyId, 
    companies, 
    loading, 
    setSelectedCompany 
  };
};

interface CompanySelectorProps {
  onCompanySelect?: (company: {id: string, name: string}) => void;
  className?: string;
  showLabel?: boolean;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ 
  onCompanySelect, 
  className, 
  showLabel = true 
}) => {
  const { companies, selectedCompany, setSelectedCompany, loading } = useCompanyContext();
  const navigate = useNavigate();
  const location = useLocation();
  const instanceId = useId(); // Generate a unique ID for this instance
  const [key, setKey] = useState(Date.now()); // Local state for forcing re-render
  
  // Force re-render when companies or selectedCompany changes
  useEffect(() => {
    console.log(`CompanySelector (${instanceId}): render with ${companies.length} companies`);
    console.log(`CompanySelector (${instanceId}): selectedCompany =`, selectedCompany?.name);
    console.log(`CompanySelector (${instanceId}): Companies available:`, companies.map(c => c.name));
    
    // Force re-render to ensure dropdown reflects current state
    setKey(Date.now());
  }, [selectedCompany, companies, instanceId]);

  const handleCompanyChange = (value: string) => {
    console.log(`CompanySelector (${instanceId}): Company changed to:`, value);
    const company = companies.find(c => c.id === value);
    if (company) {
      setSelectedCompany(company);
      console.log(`CompanySelector (${instanceId}): Selected company updated to:`, company.name);
      
      if (onCompanySelect) {
        onCompanySelect({id: company.id, name: company.name});
      }
      
      // Only redirect to dashboard if not on /settings page
      const currentPath = location.pathname;
      if (currentPath !== '/' && currentPath !== '/settings') {
        navigate('/');
      }
    }
  };

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
          key={`company-selector-${key}`}
          value={selectedCompany?.id || ''}
          onValueChange={handleCompanyChange}
          disabled={companies.length === 0}
        >
          <SelectTrigger 
            className="w-full text-white border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            <SelectValue placeholder="Select a company">
              {selectedCompany?.name || "Select a company"}
            </SelectValue>
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
