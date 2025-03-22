
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, XCircle, Image } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LogoUploaderProps {
  companyId: string;
  currentLogoUrl?: string;
  onLogoUploaded: (url: string) => void;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({ 
  companyId, 
  currentLogoUrl, 
  onLogoUploaded 
}) => {
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(currentLogoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentLogoUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    setUploading(true);
    
    try {
      const fileName = `${companyId}_logo_${Date.now()}`;
      const fileExt = file.name.split('.').pop();
      const filePath = `${fileName}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('company_logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company_logos')
        .getPublicUrl(filePath);
      
      if (urlData && urlData.publicUrl) {
        setLogoUrl(urlData.publicUrl);
        onLogoUploaded(urlData.publicUrl);
        toast.success('Logo uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(`Error uploading logo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl) return;
    
    setUploading(true);
    
    try {
      // Extract file name from URL
      const fileName = logoUrl.split('/').pop();
      
      if (fileName) {
        // Remove from storage
        const { error } = await supabase.storage
          .from('company_logos')
          .remove([fileName]);
        
        if (error) {
          throw error;
        }
      }
      
      setLogoUrl(undefined);
      setPreviewUrl(undefined);
      onLogoUploaded('');
      toast.success('Logo removed successfully');
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast.error(`Error removing logo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Company Logo</h3>
      </div>
      
      {previewUrl ? (
        <div className="relative border rounded-md p-4 flex flex-col items-center">
          <img 
            src={previewUrl} 
            alt="Company logo" 
            className="max-h-40 max-w-full object-contain" 
          />
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleRemoveLogo}
            disabled={uploading}
            className="mt-4"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Remove Logo
          </Button>
        </div>
      ) : (
        <div className="border border-dashed rounded-md p-8 flex flex-col items-center justify-center gap-2 bg-muted/30">
          <Image className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Upload your company logo
          </p>
          <p className="text-xs text-muted-foreground">
            Recommended size: 500 x 200 pixels
          </p>
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="relative"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Logo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </Button>
          </div>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-2">
        Logo will be displayed on your invoices. For best results, upload a PNG or SVG with transparent background.
      </p>
    </div>
  );
};

export default LogoUploader;
