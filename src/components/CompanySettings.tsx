
import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Check, Upload, X, Image } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryDropdown } from './ui/country-dropdown';
import { CurrencyDropdown } from './ui/currency-dropdown';
import { timezones } from '@/lib/timezones';
import { useCompanyForm } from '@/hooks/use-company-form';

const CompanySettings = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    formData,
    logoPreview,
    isLoading,
    uploadingLogo,
    selectedCompanyId,
    isAddingNew,
    companies,
    handleInputChange,
    handleSelectChange,
    handleLogoUpload,
    handleSubmit,
    handleDelete,
    setIsAddingNew,
    setSelectedCompanyId,
    setLogoPreview,
    setFormData,
  } = useCompanyForm(user?.id);

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Company Settings</h2>
        <Button 
          onClick={() => {
            setIsAddingNew(true);
            setSelectedCompanyId(null);
            setFormData({
              name: '',
              description: '',
              country: '',
              timezone: 'UTC',
              currency: '',
            });
            setLogoPreview(null);
          }} 
          variant="outline" 
          disabled={isAddingNew}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Company
        </Button>
      </div>

      {!isAddingNew && (
        <div className="max-w-md">
          <Label htmlFor="company-select">Select Company</Label>
          <Select
            value={selectedCompanyId || ''}
            onValueChange={setSelectedCompanyId}
            disabled={isLoading || companies.length === 0}
          >
            <SelectTrigger id="company-select">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name} {company.is_default && '(Default)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleInputChange}
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Country</Label>
            <CountryDropdown
              value={formData.country || ''}
              onChange={(value) => handleSelectChange('country', value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone || 'UTC'}
              onValueChange={(value) => handleSelectChange('timezone', value)}
              disabled={isLoading}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
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

        <div>
          <Label htmlFor="currency">Currency</Label>
          <CurrencyDropdown
            value={formData.currency || ''}
            onChange={(value) => handleSelectChange('currency', value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="h-16 w-16 object-contain rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2"
                  onClick={() => {
                    setLogoPreview(null);
                    setFormData((prev) => ({ ...prev, logo_url: '' }));
                  }}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="h-16 w-16 bg-slate-200 rounded flex items-center justify-center">
                <Image className="h-8 w-8 text-slate-400" />
              </div>
            )}
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploadingLogo}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            <Check className="h-4 w-4 mr-2" />
            {isAddingNew ? 'Create Company' : 'Save Changes'}
          </Button>
          {!isAddingNew && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || companies.length <= 1}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Company
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;
