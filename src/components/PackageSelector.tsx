
import React, { useState, useEffect } from 'react';
import { Package, InvoiceItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Package as PackageIcon, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';

interface PackageSelectorProps {
  onPackageSelect: (items: InvoiceItem[]) => void;
  variant?: 'default' | 'inline' | 'direct-list';
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
  const { selectedCompany } = useCompanyContext();

  useEffect(() => {
    const fetchPackages = async () => {
      if (!user || !selectedCompany) return;
      
      setLoading(true);
      try {
        console.log('Fetching packages for company ID:', selectedCompany.id);
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .eq('company_id', selectedCompany.id);
        
        if (error) throw error;
        
        console.log('Fetched packages:', data?.length || 0);
        
        if (Array.isArray(data)) {
          setPackages(data);
          console.log('Package state set to array with length:', data.length);
        } else {
          console.error('Packages data is not an array:', data);
          setPackages([]);
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
        toast.error('Failed to load packages');
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [user, selectedCompany]);

  const handlePackageSelection = (packageName: string) => {
    if (!Array.isArray(packages) || packages.length === 0) {
      console.error('Packages array is undefined or empty');
      toast.error('Unable to select package');
      return;
    }
    
    console.log('[PackageSelector] Selected package name:', packageName);
    console.log('[PackageSelector] Available packages:', packages);
    
    const selectedPackage = packages.find(pkg => pkg.name === packageName);
    
    if (!selectedPackage) {
      console.error('[PackageSelector] Selected package not found:', packageName);
      toast.error('Selected package not found');
      return;
    }
    
    console.log('[PackageSelector] Found selected package:', selectedPackage);
    
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: selectedPackage.name, // Set name from package
      description: selectedPackage.description || '',
      quantity: 1,
      rate: selectedPackage.price,
      amount: selectedPackage.price
    };
    
    console.log('[PackageSelector] Created invoice item from package:', newItem);
    console.log('[PackageSelector] InvoiceItem name property:', newItem.name);
    
    setOpen(false);
    onPackageSelect([newItem]);
    toast.success(`Added "${selectedPackage.name}" to invoice`);
  };

  if (!Array.isArray(packages) || packages.length === 0) {
    const content = (
      <div className="p-2 text-center text-sm text-muted-foreground">
        No packages found. Create some in Settings.
      </div>
    );

    if (variant === 'inline') {
      return (
        <Button
          variant="ghost"
          className="justify-start text-left text-muted-foreground hover:text-foreground w-full"
          disabled={true}
        >
          <FileText className="mr-2 h-4 w-4" />
          {loading ? "Loading packages..." : "No packages available"}
        </Button>
      );
    }

    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {loading ? "Loading packages..." : "No packages available. Create some in Settings."}
      </div>
    );
  }

  console.log('Creating CommandItems from packages:', packages);
  const packageItems = packages.map((pkg) => {
    console.log('Individual package being mapped:', pkg);
    
    if (!pkg || typeof pkg !== 'object') {
      console.error('Invalid package object:', pkg);
      return null;
    }
    
    if (!pkg.id || !pkg.name) {
      console.error('Package missing required properties:', pkg);
      return null;
    }
    
    if (variant === 'direct-list') {
      return (
        <CommandItem
          key={pkg.id}
          value={pkg.name}
          onSelect={(currentValue) => {
            console.log('Command item selected with value:', currentValue);
            handlePackageSelection(currentValue);
          }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="font-medium">{pkg.name}</span>
            </div>
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(pkg.price)}
            </span>
          </div>
        </CommandItem>
      );
    }
    
    return (
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
    );
  }).filter(Boolean);

  console.log('packageItems array created with length:', packageItems.length);

  if (variant === 'direct-list') {
    return (
      <Command>
        <CommandInput placeholder="Search packages..." />
        <CommandEmpty>No package found.</CommandEmpty>
        <CommandList>
          <CommandGroup>
            {packageItems}
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }

  if (variant === 'inline') {
    console.log('Rendering inline variant with', packageItems.length, 'items');
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="justify-start text-left text-muted-foreground hover:text-foreground w-full"
            disabled={loading}
            onClick={() => {
              console.log('Package selector button clicked, current packages:', packages);
              setOpen(true);
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search packages..." />
            <CommandEmpty>No package found.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {packageItems}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  console.log('Rendering default variant with', packageItems.length, 'items');
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={loading}
          onClick={() => {
            console.log('Package selector button clicked, current packages:', packages);
            setOpen(true);
          }}
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
          <CommandEmpty>No package found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {packageItems}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PackageSelector;
