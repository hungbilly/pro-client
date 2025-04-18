
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './CompanySelector';
import { Package, InvoiceItem } from '@/types';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QuillEditor from './QuillEditor';

interface AddProductPackageDialogProps {
  open: boolean; // Changed from isOpen to open
  onOpenChange: (open: boolean) => void; // Changed from onClose to onOpenChange
  onAddItems: (items: InvoiceItem[]) => void; // Changed from onPackageSelect
}

const AddProductPackageDialog: React.FC<AddProductPackageDialogProps> = ({
  open, // Updated prop name
  onOpenChange, // Updated prop name
  onAddItems, // Updated prop name
}) => {
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [discount, setDiscount] = useState<number>(0);
  const { selectedCompany } = useCompany();
  
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
    enabled: !!selectedCompany?.id && open, // Updated condition
  });

  const handlePackageChange = (packageId: string) => {
    setSelectedPackageId(packageId);
    
    if (packageId) {
      const selectedPackage = packages.find(pkg => pkg.id === packageId);
      if (selectedPackage) {
        setCustomName(selectedPackage.name);
        setCustomDescription(selectedPackage.description || '');
        setPrice(selectedPackage.price);
      }
    }
  };

  const calculateTotal = () => {
    const subtotal = price * quantity;
    const discountAmount = subtotal * (discount / 100);
    return subtotal - discountAmount;
  };

  const handleAddItem = () => {
    if (!customName) {
      toast.error('Product/Package name is required');
      return;
    }

    const totalAmount = calculateTotal();
    
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: customName,
      description: customDescription || customName,
      quantity: quantity,
      rate: price,
      amount: totalAmount,
      discount: discount > 0 ? discount.toString() : undefined
    };
    
    onAddItems([newItem]); // Updated function call
    toast.success(`Added "${customName}" to invoice`);
    onOpenChange(false); // Updated function call
  };

  useEffect(() => {
    if (!open) { // Updated condition
      setSelectedPackageId('');
      setCustomName('');
      setCustomDescription('');
      setPrice(0);
      setQuantity(1);
      setDiscount(0);
    }
  }, [open]); // Updated dependency

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Add a product or package to your invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="package-select">Choose Existing Product / Package</Label>
            <Select 
              value={selectedPackageId} 
              onValueChange={handlePackageChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose Existing Product / Package" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingPackages ? (
                  <SelectItem value="loading" disabled>Loading packages...</SelectItem>
                ) : packages.length === 0 ? (
                  <SelectItem value="none" disabled>No packages found</SelectItem>
                ) : (
                  packages.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="item-name" className="flex items-center">
              Product / Package Name <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input 
              id="item-name" 
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter a Product / Package name"
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="item-description" className="flex items-center">
                Description <span className="text-red-500 ml-1">*</span>
              </Label>
              <span className="text-sm text-blue-600 cursor-pointer">Insert Message Variable ▾</span>
            </div>
            <QuillEditor
              id="item-description"
              value={customDescription}
              onChange={setCustomDescription}
              placeholder="Type text here..."
              className="mt-1"
              alwaysShowToolbar={true}
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {customDescription ? customDescription.length : 0}/4000
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="item-price" className="flex items-center">
                Price <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="item-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.01}
              />
            </div>
            <div>
              <Label htmlFor="item-quantity" className="flex items-center">
                Quantity <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="item-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="item-discount" className="flex items-center">
                Discount <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="flex">
                <Input
                  id="item-discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={100}
                />
                <span className="inline-flex items-center px-3 bg-muted border border-l-0 border-input rounded-r-md">
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-md p-4 mt-6">
            <div className="text-lg font-medium mb-2">TOTAL AMOUNT</div>
            <div className="text-2xl font-bold mb-4">${calculateTotal().toFixed(2)}</div>
            <div className="flex justify-between text-sm">
              <span>Price</span>
              <span>{quantity} x ${price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Tax</span>
              <span>No Tax</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between mt-4 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddItem}
            className="bg-green-600 hover:bg-green-700"
          >
            Save Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductPackageDialog;
