
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyContext } from '@/context/CompanyContext';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';

interface CompanySelectorProps {
  onCompanySelect?: (company: {id: string, name: string}) => void;
  className?: string;
  showLabel?: boolean;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ onCompanySelect, className, showLabel = false }) => {
  const { companies, selectedCompany, setSelectedCompany, loading } = useCompanyContext();

  const handleCompanyChange = (value: string) => {
    console.log("CompanySelector: Company changed to:", value);
    const company = companies.find(c => c.id === value);
    if (company) {
      setSelectedCompany(company);
      if (onCompanySelect) {
        onCompanySelect({id: company.id, name: company.name});
      }
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading companies...</div>;
  }

  if (companies.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No companies found. Please add a company in Settings.
      </div>
    );
  }

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center gap-1 mb-1 text-sm font-medium">
          <Building className="h-4 w-4" />
          <span>Company</span>
        </div>
      )}
      <div>
        <Select 
          value={selectedCompany?.id || ''} 
          onValueChange={handleCompanyChange}
          disabled={companies.length === 0}
        >
          <SelectTrigger className="min-w-[200px]">
            <SelectValue placeholder="Select a company" />
          </SelectTrigger>
          <SelectContent>
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
