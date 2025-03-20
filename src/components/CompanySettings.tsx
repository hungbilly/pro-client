
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from './CompanySelector';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryDropdown } from './ui/country-dropdown';
import { CurrencyDropdown } from './ui/currency-dropdown';

interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  country?: string;
  currency?: string;
  is_default: boolean;
}

const CompanySettings = () => {
  const { user } = useAuth();
  const { companies, loading: companyContextLoading, refreshCompanies } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state with default values
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [country, setCountry] = useState('hk'); // Default to 'hk'
  const [currency, setCurrency] = useState('hkd'); // Default to 'hkd'
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    console.log("CompanySettings: Companies from context:", companies);
    console.log("CompanySettings: companyContextLoading:", companyContextLoading);
    
    if (!companyContextLoading) {
      setIsLoading(false);
      
      // If there's at least one company, select the first one
      if (companies && companies.length > 0) {
        const defaultCompany = companies.find(c => c.is_default);
        const companyToSelect = defaultCompany || companies[0];
        setSelectedCompanyId(companyToSelect.id);
        populateFormWithCompany(companyToSelect);
      } else {
        // If no companies exist, show the add new form
        setIsAddingNew(true);
        resetForm();
      }
    }
  }, [companies, companyContextLoading]);

  const populateFormWithCompany = (company: Company) => {
    setName(company.name);
    setAddress(company.address || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setWebsite(company.website || '');
    setLogoUrl(company.logo_url || '');
    setCountry(company.country || 'hk'); // Fallback to 'hk'
    setCurrency(company.currency || 'hkd'); // Fallback to 'hkd'
    setIsDefault(company.is_default);
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setLogoUrl('');
    setCountry('hk'); // Reset to 'hk'
    setCurrency('hkd'); // Reset to 'hkd'
    setIsDefault(companies.length === 0); // Make default if it's the first company
  };

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setIsAddingNew(false);
    
    const selectedCompany = companies.find(c => c.id === companyId);
    if (selectedCompany) {
      populateFormWithCompany(selectedCompany);
    }
  };

  const handleAddNew = () => {
    setSelectedCompanyId(null);
    setIsAddingNew(true);
    resetForm();
  };

  const handleSave = async () => {
    if (!name) {
      toast.error('Company name is required');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to save company information');
      return;
    }

    setIsLoading(true);
    try {
      if (isAddingNew) {
        // Create new company
        const { data, error } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            name,
            address,
            phone,
            email,
            website,
            logo_url: logoUrl,
            country,
            currency,
            is_default: isDefault
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // If setting as default, update other companies
        if (isDefault) {
          await updateDefaultCompany(data.id);
        }
        
        toast.success('Company created successfully');
        setIsAddingNew(false);
        setSelectedCompanyId(data.id);
        await refreshCompanies();
      } else if (selectedCompanyId) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update({
            name,
            address,
            phone,
            email,
            website,
            logo_url: logoUrl,
            country,
            currency,
            is_default: isDefault,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCompanyId);
        
        if (error) throw error;
        
        // If setting as default, update other companies
        if (isDefault) {
          await updateDefaultCompany(selectedCompanyId);
        }
        
        toast.success('Company updated successfully');
        await refreshCompanies();
      }
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error('Failed to save company');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDefaultCompany = async (newDefaultId: string) => {
    try {
      // Set all other companies to not default
      const { error } = await supabase
        .from('companies')
        .update({ is_default: false })
        .neq('id', newDefaultId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating default company:', error);
      toast.error('Failed to update default company');
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompanyId || isAddingNew) return;
    
    const isConfirmed = window.confirm('Are you sure you want to delete this company? This will affect all associated clients, jobs, and invoices.');
    
    if (isConfirmed) {
      try {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', selectedCompanyId);
        
        if (error) throw error;
        
        toast.success('Company deleted successfully');
        await refreshCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
        toast.error('Failed to delete company');
      }
    }
  };

  // Display loading skeleton while the initial data is being fetched
  if (companyContextLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  // Display message if no companies and not in adding mode
  if (companies.length === 0 && !isAddingNew) {
    return (
      <div className="text-center p-8">
        <p className="mb-4">No companies found. Please create your first company.</p>
        <Button onClick={handleAddNew}>Create Company</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <Label htmlFor="company-select">Select Company</Label>
          <div className="flex gap-2 mt-1">
            <Select 
              value={selectedCompanyId || ''} 
              onValueChange={handleCompanySelect}
              disabled={isAddingNew || companies.length === 0}
            >
              <SelectTrigger className="w-full">
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
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleAddNew}
              title="Add New Company"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Country</Label>
            <CountryDropdown
              value={country}
              onChange={setCountry}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <CurrencyDropdown
              value={currency}
              onChange={setCurrency}
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="default-company"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="default-company">Set as default company</Label>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        {!isAddingNew && selectedCompanyId && (
          <Button 
            variant="destructive" 
            onClick={handleDeleteCompany}
            disabled={companies.length <= 1}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Company
          </Button>
        )}
        <div className={!isAddingNew && selectedCompanyId ? '' : 'ml-auto'}>
          <Button onClick={handleSave} disabled={isLoading}>
            <Check className="h-4 w-4 mr-2" />
            {isAddingNew ? 'Create Company' : 'Update Company'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
