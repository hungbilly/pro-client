import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  country?: string;
  currency?: string;
  timezone: string;
  is_default: boolean;
  user_id: string;
  payment_methods?: string;
}

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  selectedCompanyId: string | null; 
  setSelectedCompany: (company: Company) => void;
  setSelectedCompanyId: (id: string | null) => void; 
  loading: boolean;
  refreshCompanies: () => Promise<void>;
  error: Error | null;
}

const STORAGE_KEY = 'selectedCompanyId';

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Computed property based on selectedCompany
  const selectedCompanyId = selectedCompany?.id || null;

  // Wrapper function that also persists to localStorage
  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      console.log("CompanyProvider: Saving company ID to localStorage:", company.id);
      localStorage.setItem(STORAGE_KEY, company.id);
    } else {
      console.log("CompanyProvider: Removing company ID from localStorage");
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Function to set selectedCompany by ID
  const setSelectedCompanyId = (id: string | null) => {
    if (!id) {
      setSelectedCompany(null);
      return;
    }
    
    const company = companies.find(c => c.id === id);
    if (company) {
      setSelectedCompany(company);
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user) {
        console.log("No user found in CompanyProvider, aborting fetch");
        setLoading(false);
        setCompanies([]);
        setSelectedCompany(null);
        return;
      }
      
      console.log("CompanyProvider: Fetching companies for user:", user.id);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      
      if (error) throw error;
      
      console.log("CompanyProvider: Fetched companies:", data?.length);
      
      if (data && data.length > 0) {
        setCompanies(data);
        
        // Get the saved company ID from localStorage
        const savedCompanyId = localStorage.getItem(STORAGE_KEY);
        console.log("CompanyProvider: Saved company ID from localStorage:", savedCompanyId);
        
        // Check if the current selectedCompany or localStorage ID is still valid in the new data
        const currentSelectedId = selectedCompany?.id || savedCompanyId;
        const currentSelectionStillValid = currentSelectedId && 
          data.some(company => company.id === currentSelectedId);
        
        if (currentSelectionStillValid) {
          // Keep the current selection but update it with fresh data
          const updatedSelection = data.find(c => c.id === currentSelectedId)!;
          console.log("CompanyProvider: Keeping current selection:", updatedSelection.id);
          setSelectedCompany(updatedSelection);
        } else {
          // Only select default if no valid selection exists
          const defaultCompany = data.find(c => c.is_default);
          const company = defaultCompany ? defaultCompany : data[0];
          console.log("CompanyProvider: Setting selected company to:", company.id);
          setSelectedCompany(company);
        }
      } else {
        setCompanies([]);
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError(error instanceof Error ? error : new Error('Failed to load companies'));
      toast.error('Failed to load companies. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompanies();
    } else {
      setLoading(false);
      setCompanies([]);
      setSelectedCompany(null);
    }
  }, [user]);

  console.log("CompanyProvider rendering with selectedCompany:", selectedCompany?.id);

  return (
    <CompanyContext.Provider value={{ 
      companies, 
      selectedCompany, 
      selectedCompanyId,
      setSelectedCompany, 
      setSelectedCompanyId,
      loading, 
      refreshCompanies: fetchCompanies,
      error
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanyContext = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    console.error("useCompanyContext called outside of CompanyProvider! Check component hierarchy.");
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
};

export default CompanyProvider;
