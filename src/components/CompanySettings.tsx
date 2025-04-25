import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Check, Upload, X, Image, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from './CompanySelector';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryDropdown } from './ui/country-dropdown';
import { CurrencyDropdown } from './ui/currency-dropdown';
import { timezones } from '@/lib/timezones';

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
  timezone: string;
  is_default: boolean;
}

const CompanySettings = () => {
  const { user } = useAuth();
  const { companies, loading: companyContextLoading, refreshCompanies, setSelectedCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [country, setCountry] = useState('hk');
  const [currency, setCurrency] = useState('hkd');
  const [timezone, setTimezone] = useState('UTC');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    console.log("CompanySettings: Companies from context:", companies);
    console.log("CompanySettings: companyContextLoading:", companyContextLoading);
    
    if (!companyContextLoading) {
      setIsLoading(false);
      
      if (companies && companies.length > 0) {
        const defaultCompany = companies.find(c => c.is_default);
        const companyToSelect = defaultCompany || companies[0];
        setSelectedCompanyId(companyToSelect.id);
        populateFormWithCompany(companyToSelect);
      } else {
        setIsAddingNew(true);
        resetForm();
      }
    }
  }, [companies, companyContextLoading]);

  // Get user's local timezone for default value when creating a new company
  const userLocalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const populateFormWithCompany = (company: Company) => {
    setName(company.name);
    setAddress(company.address || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setWebsite(company.website || '');
    setLogoUrl(company.logo_url || '');
    setCountry(company.country || 'hk');
    setCurrency(company.currency || 'hkd');
    setTimezone(company.timezone || 'UTC');
    setIsDefault(company.is_default);
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setLogoUrl('');
    setCountry('hk');
    setCurrency('hkd');
    setTimezone(userLocalTimezone); // Set to user's local timezone by default for new companies
    setIsDefault(companies.length === 0);
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
            timezone,
            is_default: isDefault
          })
          .select()
          .single();
        
        if (error) throw error;
        
        if (isDefault) {
          await updateDefaultCompany(data.id);
        }
        
        toast.success('Company created successfully');
        
        // Update the UI immediately with the new company
        setIsAddingNew(false);
        setSelectedCompanyId(data.id);
        
        // Set as selected company in context to update the CompanySelector
        setSelectedCompany(data);
        
        // Refresh companies list to update UI
        await refreshCompanies();
      } else if (selectedCompanyId) {
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
            timezone,
            is_default: isDefault,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCompanyId);
        
        if (error) throw error;
        
        if (isDefault) {
          await updateDefaultCompany(selectedCompanyId);
        }
        
        toast.success('Company updated successfully');
        
        // Refresh companies to update UI
        await refreshCompanies();
        
        // If this is the selected company, update it in context
        if (selectedCompanyId) {
          const updatedCompany = {
            id: selectedCompanyId,
            name,
            address,
            phone,
            email,
            website,
            logo_url: logoUrl,
            country,
            currency,
            timezone,
            is_default: isDefault,
            user_id: user.id
          };
          setSelectedCompany(updatedCompany);
        }
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    if (fileType !== 'image/png' && fileType !== 'image/jpeg') {
      toast.error('Please upload a PNG or JPG image');
      return;
    }

    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > 2) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const extension = file.name.split('.').pop();
      const fileName = `${user?.id}/${selectedCompanyId || 'new'}_${Date.now()}.${extension}`;

      const { data, error } = await supabase.storage
        .from('company_logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('company_logos')
        .getPublicUrl(fileName);

      setLogoUrl(urlData.publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    toast.success('Logo removed');
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

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
          <Label htmlFor="logo">Company Logo</Label>
          <div className="mt-2 space-y-3">
            {logoUrl ? (
              <div className="relative w-40 h-40 border rounded-md overflow-hidden">
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="w-full h-full object-contain"
                />
                <Button 
                  variant="destructive" 
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                  onClick={handleRemoveLogo}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-40 h-40 bg-muted rounded-md border-2 border-dashed border-gray-300">
                <Image className="h-10 w-10 text-gray-400" />
              </div>
            )}
            
            <div className="flex space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
              />
              <Button 
                variant="outline" 
                onClick={triggerFileInput}
                disabled={uploadingLogo}
                className="flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Upload PNG or JPG (max 2MB)
              </p>
            </div>
          </div>
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <Label htmlFor="timezone">Time Zone</Label>
            <Select
              value={timezone}
              onValueChange={setTimezone}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 opacity-70" />
                  <SelectValue placeholder="Select timezone" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button onClick={handleSave} disabled={isLoading || uploadingLogo}>
            <Check className="h-4 w-4 mr-2" />
            {isAddingNew ? 'Create Company' : 'Update Company'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
