
import React, { useState, useEffect } from 'react';
import { Package, InvoiceItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Package as PackageIcon, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface PackageSelectorProps {
  onPackageSelect: (items: InvoiceItem[]) => void;
  variant?: 'default' | 'inline';
  placeholder?: string;
}

const PackageSelector: React.FC<PackageSelectorProps> = ({ 
  onPackageSelect, 
  variant = 'default',
  placeholder = 'Select package...'
}) => {
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
        
        console.log('Fetched packages:', data);
        setPackages(data || []);
      } catch (error) {
        console.error('Error fetching packages:', error);
        toast.error('Failed to load packages');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [user]);

  const handlePackageSelection = (packageName: string) => {
    // Safety check to ensure packages is defined and is an array
    if (!Array.isArray(packages) || packages.length === 0) {
      console.error('Packages array is undefined or empty');
      toast.error('Unable to select package');
      return;
    }
    
    console.log('Selected package name:', packageName);
    console.log('Available packages:', packages);
    
    // Find the selected package by name
    const selectedPackage = packages.find(pkg => pkg.name === packageName);
    
    if (!selectedPackage) {
      console.error('Selected package not found:', packageName);
      toast.error('Selected package not found');
      return;
    }
    
    console.log('Found selected package:', selectedPackage);
    
    // Convert the package to an invoice item
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: `${selectedPackage.name}${selectedPackage.description ? ` - ${selectedPackage.description}` : ''}`,
      quantity: 1,
      rate: selectedPackage.price,
      amount: selectedPackage.price
    };
    
    console.log('Created invoice item from package:', newItem);
    
    // Close popover and add the item
    setOpen(false);
    onPackageSelect([newItem]);
    toast.success(`Added "${selectedPackage.name}" to invoice`);
  };

  // Render the component based on the variant
  if (variant === 'inline') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="justify-start text-left text-muted-foreground hover:text-foreground w-full"
            disabled={loading}
            onClick={() => console.log('Package selector button clicked, current packages:', packages)}
          >
            <FileText className="mr-2 h-4 w-4" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search packages..." />
            <CommandEmpty>
              {packages.length === 0 ? 'No packages found. Create some in Settings.' : 'No package found.'}
            </CommandEmpty>
            <CommandGroup>
              {(Array.isArray(packages) ? packages : []).map((pkg) => (
                <CommandItem
                  key={pkg.id}
                  value={pkg.name}
                  onSelect={(currentValue) => {
                    console.log('Command item selected with value:', currentValue);
                    handlePackageSelection(currentValue);
                  }}
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
  }

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
            <PackageIcon className="mr-2 h-4 w-4" />
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
            {(Array.isArray(packages) ? packages : []).map((pkg) => (
              <CommandItem
                key={pkg.id}
                value={pkg.name}
                onSelect={(currentValue) => {
                  console.log('Command item selected with value:', currentValue);
                  handlePackageSelection(currentValue);
                }}
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
