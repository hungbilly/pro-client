
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package as PackageIcon, Search, Upload, Plus, Image as ImageIcon, Check } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [imagePosition, setImagePosition] = useState('above');
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState('packages');
  
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

  const handleAddCustomItem = () => {
    if (!customName) {
      toast.error('Product/Package name is required');
      return;
    }

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: customName,
      description: customDescription || customName,
      quantity: 1,
      rate: customPrice,
      amount: customPrice
    };
    
    onPackageSelect([newItem]);
    toast.success(`Added "${customName}" to invoice`);
    onClose();
  };

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCustomName('');
      setCustomDescription('');
      setCustomPrice(0);
      setSearchQuery('');
      setActiveTab('packages');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Add a product or package to your invoice.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="packages" className="mt-2" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="packages">Choose Existing Package</TabsTrigger>
            <TabsTrigger value="custom">Create Custom Item</TabsTrigger>
          </TabsList>
          
          <TabsContent value="packages" className="mt-4 space-y-4">
            <div className="relative">
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
          
          <TabsContent value="custom" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="item-name">Product / Package Name *</Label>
                <Input 
                  id="item-name" 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter a Product / Package name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Image (optional)</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
                  <div className="flex justify-center mb-3">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p>Click to upload an image.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Acceptable file formats are PNG, JPG and JPEG. Max file size is 2mb.
                  </p>
                </div>

                <div className="mt-4">
                  <Label>Image Placement</Label>
                  <RadioGroup 
                    defaultValue="above" 
                    className="flex mt-2 space-x-4"
                    value={imagePosition}
                    onValueChange={setImagePosition}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="above" id="above" />
                      <Label htmlFor="above">Above Description</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="below" id="below" />
                      <Label htmlFor="below">Below Description</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div>
                <Label htmlFor="item-description">Description *</Label>
                <Textarea 
                  id="item-description" 
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Enter item description"
                  className="mt-1"
                  rows={5}
                />
              </div>

              <div>
                <Label htmlFor="item-price">Price</Label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md">
                    $
                  </span>
                  <Input
                    id="item-price"
                    type="number"
                    className="rounded-l-none"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {activeTab === 'custom' && (
            <Button onClick={handleAddCustomItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductPackageDialog;
