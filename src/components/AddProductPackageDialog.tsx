
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package as PackageIcon, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './CompanySelector';
import { Package, InvoiceItem } from '@/types';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddProductPackageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPackageSelect: (items: InvoiceItem[]) => void;
}

const AddProductPackageDialog: React.FC<AddProductPackageDialogProps> = ({
  isOpen,
  onClose,
  onPackageSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedCompany } = useCompany();
  
  // Fetch packages for the selected company
  const { data: packages = [], isLoading: isLoadingPackages } = useQuery({
    queryKey: ['packages', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('company_id', selectedCompany.id);
      
      if (error) {
        console.error('Error fetching packages:', error);
        toast.error('Failed to load packages');
        return [];
      }
      
      return data || [];
    },
    enabled: !!selectedCompany?.id && isOpen,
  });

  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (pkg.description && pkg.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePackageSelect = (pkg: Package) => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: pkg.name,
      description: pkg.description || pkg.name,
      quantity: 1,
      rate: pkg.price,
      amount: pkg.price
    };
    
    onPackageSelect([newItem]);
    toast.success(`Added "${pkg.name}" to invoice`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Products & Packages</DialogTitle>
          <DialogDescription>
            Choose from your existing products and packages
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="packages" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="packages" className="mt-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search packages..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoadingPackages ? (
              <div className="text-center py-8">Loading packages...</div>
            ) : packages.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">No packages found</p>
                <p className="text-sm text-muted-foreground">
                  You can add packages in Settings → Packages
                </p>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No packages matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-secondary"
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    <div className="flex items-start gap-3">
                      <PackageIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">{pkg.name}</span>
                        {pkg.description && (
                          <span className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(pkg.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="products" className="mt-4">
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">Products coming soon</p>
              <p className="text-sm text-muted-foreground">
                This feature will be available in a future update
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductPackageDialog;
