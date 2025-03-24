
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Package } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import RichTextEditor from './RichTextEditor';

const PackageSettings = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Package, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
    name: '',
    product_name: '',
    description: '',
    price: 0,
    tax_rate: 0,
    company_id: undefined,
  });
  const [currentPackageId, setCurrentPackageId] = useState<string | null>(null);
  const { user } = useAuth();
  const { selectedCompany } = useCompanyContext();

  const fetchPackages = async () => {
    if (!user || !selectedCompany) return;
    
    setLoading(true);
    try {
      console.log('Fetching packages for company ID:', selectedCompany.id);
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      console.log('Packages fetched:', data?.length || 0);
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (selectedCompany) {
      console.log('Company changed, fetching packages for:', selectedCompany.id);
      fetchPackages();
    } else {
      console.log('No company selected, clearing packages');
      setPackages([]);
    }
  }, [user, selectedCompany]);
  
  const resetForm = () => {
    setFormData({
      name: '',
      product_name: '',
      description: '',
      price: 0,
      tax_rate: 0,
      company_id: selectedCompany?.id || undefined,
    });
    setCurrentPackageId(null);
  };
  
  const handleDialogOpen = (pkg?: Package) => {
    if (pkg) {
      setFormData({
        name: pkg.name,
        product_name: pkg.product_name || '',
        description: pkg.description || '',
        price: pkg.price,
        tax_rate: pkg.tax_rate || 0,
        company_id: pkg.company_id,
      });
      setCurrentPackageId(pkg.id);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'price' || name === 'tax_rate') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleRichTextChange = (value: string) => {
    setFormData({ ...formData, description: value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create or edit packages');
      return;
    }
    
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error('Package name is required');
      return;
    }
    
    try {
      if (currentPackageId) {
        const { error } = await supabase
          .from('packages')
          .update({
            name: formData.name,
            product_name: formData.product_name,
            description: formData.description,
            price: formData.price,
            tax_rate: formData.tax_rate,
            company_id: selectedCompany.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentPackageId)
          // Only allow updating packages that belong to the current company
          .eq('company_id', selectedCompany.id);
        
        if (error) throw error;
        
        toast.success('Package updated successfully');
      } else {
        const { error } = await supabase
          .from('packages')
          .insert({
            name: formData.name,
            product_name: formData.product_name,
            description: formData.description,
            price: formData.price,
            tax_rate: formData.tax_rate,
            company_id: selectedCompany.id,
            user_id: user.id,
          });
        
        if (error) throw error;
        
        toast.success('Package created successfully');
      }
      
      handleDialogClose();
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error('Failed to save package');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id)
        // Only allow deleting packages that belong to the current company
        .eq('company_id', selectedCompany?.id);
      
      if (error) throw error;
      
      toast.success('Package deleted successfully');
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Failed to delete package');
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Products & Packages</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-6 w-1/6" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Products & Packages</h2>
        <Button onClick={() => handleDialogOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Package
        </Button>
      </div>
      
      {packages.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-10">
            <p className="text-muted-foreground">No packages or products have been created yet.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => handleDialogOpen()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.product_name || pkg.name}</TableCell>
                    <TableCell>{pkg.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      <div className="line-clamp-2" dangerouslySetInnerHTML={{ __html: pkg.description || '' }} />
                    </TableCell>
                    <TableCell>{formatCurrency(pkg.price)}</TableCell>
                    <TableCell>{pkg.tax_rate ? `${pkg.tax_rate}%` : 'No Tax'}</TableCell>
                    <TableCell className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDialogOpen(pkg)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(pkg.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentPackageId ? 'Edit Package' : 'Add New Package'}</DialogTitle>
            <DialogDescription>
              {currentPackageId ? 'Update the package details below.' : 'Fill in the package details below.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                name="product_name"
                value={formData.product_name}
                onChange={handleInputChange}
                placeholder="e.g., Wedding Photography"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="name">Package Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Premium Package"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <RichTextEditor
                value={formData.description || ''}
                onChange={handleRichTextChange}
                placeholder="Describe what's included in this package"
              />
            </div>
            
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                name="tax_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.tax_rate}
                onChange={handleInputChange}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">
                {currentPackageId ? 'Update Package' : 'Create Package'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageSettings;
