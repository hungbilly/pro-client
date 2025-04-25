
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
}

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  selectedCompanyId: string | null; 
  setSelectedCompany: (company: Company | null) => void;
  setSelectedCompanyId: (id: string | null) => void; 
  loading: boolean;
  refreshCompanies: () => Promise<void>;
  error: Error | null;
  addCompany: (company: Omit<Company, 'id'>) => Promise<Company | null>;
  updateCompany: (company: Company) => Promise<boolean>;
}

const STORAGE_KEY = 'selectedCompanyId';

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pendingNewCompanyId, setPendingNewCompanyId] = useState<string | null>(null);

  const selectedCompanyId = selectedCompany?.id || null;

  const setSelectedCompany = (company: Company | null) => {
    console.log("CompanyProvider: Setting selected company to:", company?.name || "null");
    setSelectedCompanyState(company);
    if (company) {
      console.log("CompanyProvider: Saving company ID to localStorage:", company.id);
      localStorage.setItem(STORAGE_KEY, company.id);
      // Set pending company ID to ensure it stays selected after refresh
      setPendingNewCompanyId(company.id);
    } else {
      console.log("CompanyProvider: Removing company ID from localStorage");
      localStorage.removeItem(STORAGE_KEY);
      setPendingNewCompanyId(null);
    }
  };

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
    console.log("[CompanyContext] fetchCompanies called");
    setLoading(true);
    setError(null);
    try {
      if (!user) {
        console.log("[CompanyContext] No user found, aborting fetch");
        setLoading(false);
        setCompanies([]);
        setSelectedCompany(null);
        return;
      }
      
      console.log("[CompanyContext] Fetching companies for user:", user.id);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      
      if (error) throw error;
      
      console.log("[CompanyContext] Fetched companies:", {
        count: data?.length,
        names: data?.map(c => c.name)
      });
      
      if (data && data.length > 0) {
        setCompanies(data);
        
        // Check for pending new company first (highest priority)
        if (pendingNewCompanyId) {
          console.log("[CompanyContext] Checking for pending new company:", pendingNewCompanyId);
          const pendingCompany = data.find(c => c.id === pendingNewCompanyId);
          
          if (pendingCompany) {
            console.log("[CompanyContext] Found pending company, selecting:", pendingCompany.name);
            setSelectedCompanyState(pendingCompany);
            setPendingNewCompanyId(null); // Clear after using it
            return;
          }
          // If we didn't find the pending company, clear it and proceed with normal selection
          setPendingNewCompanyId(null);
        }
        
        // Normal selection logic (saved ID or default)
        const savedCompanyId = localStorage.getItem(STORAGE_KEY);
        console.log("[CompanyContext] Saved company ID from localStorage:", savedCompanyId);
        
        const currentSelectedId = selectedCompany?.id || savedCompanyId;
        const currentSelectionStillValid = currentSelectedId && 
          data.some(company => company.id === currentSelectedId);
        
        if (currentSelectionStillValid) {
          const updatedSelection = data.find(c => c.id === currentSelectedId)!;
          console.log("[CompanyContext] Keeping current selection:", updatedSelection.name);
          setSelectedCompanyState(updatedSelection);
        } else {
          const defaultCompany = data.find(c => c.is_default);
          const company = defaultCompany ? defaultCompany : data[0];
          console.log("[CompanyContext] Setting selected company to:", company.name);
          setSelectedCompanyState(company);
        }
      } else {
        console.log("[CompanyContext] No companies found, clearing state");
        setCompanies([]);
        setSelectedCompanyState(null);
      }
    } catch (error) {
      console.error('[CompanyContext] Error fetching companies:', error);
      setError(error instanceof Error ? error : new Error('Failed to load companies'));
      toast.error('Failed to load companies. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const addCompany = async (newCompany: Omit<Company, 'id'>): Promise<Company | null> => {
    try {
      console.log("CompanyProvider: Adding new company:", newCompany.name);
      
      const { data, error } = await supabase
        .from('companies')
        .insert(newCompany)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log("CompanyProvider: Successfully added company with ID:", data.id);
      
      // Mark this company ID as pending selection
      setPendingNewCompanyId(data.id);
      
      await fetchCompanies();
      
      console.log("CompanyProvider: Successfully refreshed companies list after adding new company");
      
      return data;
    } catch (error) {
      console.error('Error adding company:', error);
      toast.error('Failed to add company');
      return null;
    }
  };

  const updateCompany = async (updatedCompany: Company): Promise<boolean> => {
    try {
      console.log("CompanyProvider: Updating company:", updatedCompany.name);
      
      const { error } = await supabase
        .from('companies')
        .update(updatedCompany)
        .eq('id', updatedCompany.id);
      
      if (error) throw error;
      
      console.log("CompanyProvider: Successfully updated company");
      
      await fetchCompanies();
      
      console.log("CompanyProvider: Successfully refreshed companies list after updating company");
      
      return true;
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
      return false;
    }
  };

  useEffect(() => {
    console.log("[CompanyContext] Provider effect triggered:", {
      hasUser: !!user,
      companiesCount: companies.length,
      selectedCompany: selectedCompany?.name,
      pendingCompanyId: pendingNewCompanyId
    });

    if (user) {
      fetchCompanies();
    } else {
      setLoading(false);
      setCompanies([]);
      setSelectedCompany(null);
    }
  }, [user]);

  console.log("[CompanyContext] Provider rendering:", {
    companiesCount: companies.length,
    selectedCompany: selectedCompany?.name,
    loading,
    pendingCompanyId: pendingNewCompanyId
  });

  return (
    <CompanyContext.Provider value={{ 
      companies, 
      selectedCompany, 
      selectedCompanyId,
      setSelectedCompany, 
      setSelectedCompanyId,
      loading, 
      refreshCompanies: fetchCompanies,
      error,
      addCompany,
      updateCompany
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
