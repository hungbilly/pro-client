
import React, { useState, useEffect } from 'react';
import { Package, InvoiceItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Package as PackageIcon, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface PackageSelectorProps {
  onPackageSelect: (items: InvoiceItem[]) => void;
}

const PackageSelector: React.FC<PackageSelectorProps> = ({ onPackageSelect }) => {
  const [open, setOpen] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPackages = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        setPackages(data || []);
        
        // Log the fetched packages to troubleshoot
        console.log('Fetched packages:', data);
      } catch (error) {
        console.error('Error fetching packages:', error);
        toast.error('Failed to load packages');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [user]);

  const handleSelectPackage = (packageName: string) => {
    // Find the selected package by name
    const selectedPackage = packages.find(pkg => pkg.name === packageName);
    
    if (!selectedPackage) {
      console.error('Selected package not found:', packageName);
      return;
    }
    
    // Convert the package to an invoice item
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: `${selectedPackage.name}${selectedPackage.description ? ` - ${selectedPackage.description}` : ''}`,
      quantity: 1,
      rate: selectedPackage.price,
      amount: selectedPackage.price
    };
    
    onPackageSelect([newItem]);
    setOpen(false);
    toast.success(`Added "${selectedPackage.name}" to invoice`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={loading}
        >
          <div className="flex items-center">
            <Plus className="mr-1 h-4 w-4" />
            <PackageIcon className="mr-1 h-4 w-4" />
            <span>Existing Package</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search packages..." />
          <CommandEmpty>
            {packages.length === 0 ? 'No packages found. Create some in Settings.' : 'No package found.'}
          </CommandEmpty>
          <CommandGroup>
            {packages.map((pkg) => (
              <CommandItem
                key={pkg.id}
                value={pkg.name}
                onSelect={handleSelectPackage}
              >
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <span>{pkg.name}</span>
                    <span className="ml-auto font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(pkg.price)}
                    </span>
                  </div>
                  {pkg.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                      {pkg.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PackageSelector;
