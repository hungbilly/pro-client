
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';

export interface Company {
  id: string;
  name: string;
  is_default: boolean;
}

interface CompanyContextType {
  companies: Company[];
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string) => void;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

// Create a context to share company state across components
const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      console.log("CompanyProvider: Fetching companies for user:", user?.id);
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, is_default')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false })
        .order('name');
      
      if (error) throw error;
      
      console.log("CompanyProvider: Fetched companies:", data?.length);
      setCompanies(data || []);
      
      // Select default company or first one
      if (data && data.length > 0) {
        const defaultCompany = data.find(c => c.is_default);
        const companyId = defaultCompany ? defaultCompany.id : data[0].id;
        console.log("CompanyProvider: Setting selected company to:", companyId);
        setSelectedCompanyId(companyId);
      } else {
        setSelectedCompanyId(null);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  console.log("CompanyProvider rendering with selectedCompanyId:", selectedCompanyId);

  return (
    <CompanyContext.Provider value={{ 
      companies, 
      selectedCompanyId, 
      setSelectedCompanyId, 
      loading, 
      refreshCompanies: fetchCompanies 
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

interface CompanySelectorProps {
  onCompanySelect?: (companyId: string) => void;
  className?: string;
  showLabel?: boolean;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ onCompanySelect, className, showLabel = false }) => {
  const { companies, selectedCompanyId, setSelectedCompanyId, loading } = useCompany();

  const handleCompanyChange = (value: string) => {
    console.log("CompanySelector: Company changed to:", value);
    setSelectedCompanyId(value);
    if (onCompanySelect) {
      onCompanySelect(value);
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
          value={selectedCompanyId || ''} 
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
