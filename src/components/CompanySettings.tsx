
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

interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  is_default: boolean;
}

const CompanySettings = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching companies for user:", user?.id);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false })
        .order('name');
      
      if (error) {
        console.error('Error fetching companies:', error);
        setError('Failed to load companies: ' + error.message);
        throw error;
      }
      
      console.log("Companies data received:", data);
      setCompanies(data || []);
      
      // If there's at least one company, select the default or first one
      if (data && data.length > 0) {
        const defaultCompany = data.find(c => c.is_default);
        setSelectedCompanyId(defaultCompany ? defaultCompany.id : data[0].id);
        populateFormWithCompany(defaultCompany || data[0]);
      } else {
        // If no companies exist, show the add new form
        setIsAddingNew(true);
        resetForm();
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  const populateFormWithCompany = (company: Company) => {
    setName(company.name);
    setAddress(company.address || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setWebsite(company.website || '');
    setLogoUrl(company.logo_url || '');
    setIsDefault(company.is_default);
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setLogoUrl('');
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
      toast.error('You must be logged in to save a company');
      return;
    }

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
        fetchCompanies();
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
        fetchCompanies();
      }
    } catch (error: any) {
      console.error('Error saving company:', error);
      toast.error('Failed to save company: ' + error.message);
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
    } catch (error: any) {
      console.error('Error updating default company:', error);
      toast.error('Failed to update default company: ' + error.message);
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
        fetchCompanies();
      } catch (error: any) {
        console.error('Error deleting company:', error);
        toast.error('Failed to delete company: ' + error.message);
      }
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading company data...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
          <p>{error}</p>
        </div>
        <Button onClick={fetchCompanies}>Try Again</Button>
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
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            {isAddingNew ? 'Create Company' : 'Update Company'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
