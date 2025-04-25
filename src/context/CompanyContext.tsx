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
  hasAttemptedFetch: boolean;
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
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  const selectedCompanyId = selectedCompany?.id || null;

  const setSelectedCompany = (company: Company | null) => {
    console.log("CompanyProvider: Setting selected company to:", company?.name || "null");
    setSelectedCompanyState(company);
    if (company) {
      console.log("CompanyProvider: Saving company ID to localStorage:", company.id);
      localStorage.setItem(STORAGE_KEY, company.id);
      setPendingNewCompanyId(null); // Clear pending ID when explicitly setting a company
    } else {
      console.log("CompanyProvider: Removing company ID from localStorage");
      localStorage.removeItem(STORAGE_KEY);
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
    console.log("[CompanyContext] fetchCompanies called, current state:", {
      pendingNewCompanyId,
      currentSelectedId: selectedCompanyId,
      loadingState: loading,
      hasAttemptedFetch
    });
    
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
      
      setHasAttemptedFetch(true);
      
      if (data && data.length > 0) {
        console.log("[CompanyContext] Fetched companies:", {
          count: data.length,
          companies: data.map(c => ({ id: c.id, name: c.name, isDefault: c.is_default }))
        });
        
        setCompanies(data);
        
        // Check for pending new company
        if (pendingNewCompanyId) {
          console.log("[CompanyContext] Looking for pending company:", pendingNewCompanyId);
          const pendingCompany = data.find(c => c.id === pendingNewCompanyId);
          
          if (pendingCompany) {
            console.log("[CompanyContext] Found and selecting pending company:", {
              id: pendingCompany.id,
              name: pendingCompany.name
            });
            setSelectedCompanyState(pendingCompany);
            localStorage.setItem(STORAGE_KEY, pendingCompany.id);
            setPendingNewCompanyId(null);
            setLoading(false);
            return;
          } else {
            console.log("[CompanyContext] Pending company not found in fetched data");
          }
        }
        
        // No pending company, check saved company ID
        const savedCompanyId = localStorage.getItem(STORAGE_KEY);
        console.log("[CompanyContext] Checking saved company ID:", savedCompanyId);
        
        if (savedCompanyId && data.some(company => company.id === savedCompanyId)) {
          const savedCompany = data.find(c => c.id === savedCompanyId)!;
          console.log("[CompanyContext] Using saved company:", {
            id: savedCompany.id,
            name: savedCompany.name
          });
          setSelectedCompanyState(savedCompany);
        } else {
          // Fall back to default company or first company
          const defaultCompany = data.find(c => c.is_default) || data[0];
          console.log("[CompanyContext] Using fallback company:", {
            id: defaultCompany.id,
            name: defaultCompany.name,
            isDefault: defaultCompany.is_default
          });
          setSelectedCompanyState(defaultCompany);
          localStorage.setItem(STORAGE_KEY, defaultCompany.id);
        }
      } else {
        console.log("[CompanyContext] No companies found, clearing state");
        setCompanies([]);
        setSelectedCompany(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('[CompanyContext] Error fetching companies:', error);
      setError(error instanceof Error ? error : new Error('Failed to load companies'));
      toast.error('Failed to load companies');
    } finally {
      console.log("[CompanyContext] fetchCompanies completed");
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
      setPendingNewCompanyId(data.id);
      
      await fetchCompanies();
      
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
      
      // If we're updating the currently selected company, set it as pending
      if (selectedCompanyId === updatedCompany.id) {
        setPendingNewCompanyId(updatedCompany.id);
      }
      
      await fetchCompanies();
      
      return true;
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompanies();
    } else {
      setLoading(false);
      setCompanies([]);
      setSelectedCompany(null);
      setHasAttemptedFetch(false);
    }
  }, [user]);

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
      updateCompany,
      hasAttemptedFetch
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
