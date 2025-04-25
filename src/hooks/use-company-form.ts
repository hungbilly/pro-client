
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/components/CompanySelector';

interface Company {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  country?: string;
  timezone: string;
  currency?: string;
  is_default: boolean;
  user_id: string;
  created_at: string;
}

export const useCompanyForm = (userId: string | undefined) => {
  const { companies, refreshCompanies, setSelectedCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    description: '',
    country: '',
    timezone: 'UTC',
    currency: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
    if (selectedCompanyId && !isAddingNew) {
      const company = companies.find((c) => c.id === selectedCompanyId);
      if (company) {
        setFormData({
          name: company.name,
          description: company.description || '',
          country: company.country || '',
          timezone: company.timezone || 'UTC',
          currency: company.currency || '',
        });
        setLogoPreview(company.logo_url || null);
      }
    }
    setIsLoading(false);
  }, [companies, selectedCompanyId, isAddingNew]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('company-logos').getPublicUrl(fileName);
      setLogoPreview(data.publicUrl);
      setFormData((prev) => ({ ...prev, logo_url: data.publicUrl }));
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Logo Upload Error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error('You must be logged in to save company settings');
      return;
    }

    setIsLoading(true);
    try {
      if (isAddingNew) {
        const newCompany = {
          ...formData,
          user_id: userId,
          created_at: new Date().toISOString(),
          is_default: companies.length === 0,
          timezone: formData.timezone || 'UTC',
        };

        const { data, error } = await supabase
          .from('companies')
          .insert(newCompany)
          .select()
          .single();

        if (error) throw error;

        await refreshCompanies();
        setSelectedCompany(data);
        setSelectedCompanyId(data.id);
        toast.success('Company created successfully');
        setIsAddingNew(false);
      } else {
        const { error } = await supabase
          .from('companies')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedCompanyId);

        if (error) throw error;
        await refreshCompanies();
        toast.success('Company updated successfully');
      }
    } catch (error) {
      console.error('Submit Error:', error);
      toast.error('Failed to save company settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompanyId) return;
    if (confirm('Are you sure you want to delete this company?')) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', selectedCompanyId);

        if (error) throw error;

        toast.success('Company deleted successfully');
        setSelectedCompanyId(companies[0]?.id || null);
        await refreshCompanies();
      } catch (error) {
        console.error('Delete Error:', error);
        toast.error('Failed to delete company');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
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
  };
};
