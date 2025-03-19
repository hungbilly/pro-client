
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types';
import { getDefaultCompany } from '@/lib/storage';

type CompanyContextType = {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company) => void;
  loading: boolean;
};

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  selectedCompany: null,
  setSelectedCompany: () => {},
  loading: true
});

export const useCompanyContext = () => useContext(CompanyContext);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // Fetch companies from Supabase
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('is_default', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setCompanies(data);
          
          // Get default company or first company
          const defaultCompany = await getDefaultCompany();
          setSelectedCompany(defaultCompany || data[0]);
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <CompanyContext.Provider 
      value={{ 
        companies, 
        selectedCompany, 
        setSelectedCompany, 
        loading 
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export default CompanyProvider;
