import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Save, Trash2, Edit } from 'lucide-react';
import { useCompanyContext } from '@/context/CompanyContext';
import { InvoiceTemplate, InvoiceItem, PaymentSchedule } from '@/types';
import PackageSelector from './PackageSelector';
import DiscountSelector from './DiscountSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QuillEditor from './QuillEditor';

// Schema for template form
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  contractTerms: z.string().optional(),
  notes: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface ContractTemplate {
  id: string;
  name: string;
  content: string;
}

interface DiscountItem {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

const InvoiceTemplateSettings = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<DiscountItem[]>([]);
  const [selectedPaymentSchedules, setSelectedPaymentSchedules] = useState<PaymentSchedule[]>([]);
  const [contractTerms, setContractTerms] = useState('');
  const [selectedContractTemplateId, setSelectedContractTemplateId] = useState<string>('');

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      contractTerms: '',
      notes: '',
    }
  });

  useEffect(() => {
    if (selectedCompany) {
      loadTemplates();
      loadContractTemplates();
    }
  }, [selectedCompany]);

  const loadContractTemplates = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('id, name, content')
        .eq('company_id', selectedCompany.id);

      if (error) throw error;
      setContractTemplates(data || []);
    } catch (error) {
      console.error('Error loading contract templates:', error);
      toast.error('Failed to load contract templates');
    }
  };

  const loadTemplates = async () => {
    if (!selectedCompany) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (error) throw error;
      
      // Convert from database format to our app format
      const formattedTemplates = data?.map(template => {
        // Parse content JSON safely
        let parsedContent;
        try {
          parsedContent = template.content ? JSON.parse(template.content) : {};
        } catch (e) {
          console.error('Error parsing template content:', e);
          parsedContent = {};
        }
        
        return {
          id: template.id,
          name: template.name,
          description: template.description || undefined,
          items: parsedContent.items || [],
          discounts: parsedContent.discounts || [],
          paymentSchedules: parsedContent.paymentSchedules || [],
          contractTerms: parsedContent.contractTerms || undefined,
          notes: parsedContent.notes || undefined,
          companyId: template.company_id,
          userId: template.user_id,
          createdAt: template.created_at,
          updatedAt: template.updated_at,
          // Keep the database format fields too
          company_id: template.company_id,
          user_id: template.user_id,
          content: template.content,
          created_at: template.created_at,
          updated_at: template.updated_at,
        };
      }) as InvoiceTemplate[];
      
      setTemplates(formattedTemplates || []);
    } catch (error) {
      console.error('Error loading invoice templates:', error);
      toast.error('Failed to load invoice templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsSelect = (items: InvoiceItem[]) => {
    setSelectedItems(prev => [...prev, ...items]);
  };

  const handleDiscountSelect = (discounts: DiscountItem[]) => {
    setSelectedDiscounts(prev => [...prev, ...discounts]);
  };

  const handleAddCustomItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setSelectedItems(prev => [...prev, newItem]);
  };

  const handleAddCustomDiscount = () => {
    const newDiscount: DiscountItem = {
      id: Date.now().toString(),
      name: '',
      amount: 0,
      type: 'fixed'
    };
    setSelectedDiscounts(prev => [...prev, newDiscount]);
  };

  const handleAddPaymentSchedule = () => {
    const newSchedule: PaymentSchedule = {
      id: Date.now().toString(),
      description: '',
      dueDate: '',
      percentage: 0,
      status: 'unpaid'
    };
    setSelectedPaymentSchedules(prev => [...prev, newSchedule]);
  };

  const handleUpdateItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate amount when quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleUpdateDiscount = (discountId: string, field: keyof DiscountItem, value: any) => {
    setSelectedDiscounts(prev => prev.map(discount => 
      discount.id === discountId ? { ...discount, [field]: value } : discount
    ));
  };

  const handleUpdatePaymentSchedule = (scheduleId: string, field: keyof PaymentSchedule, value: any) => {
    setSelectedPaymentSchedules(prev => prev.map(schedule => 
      schedule.id === scheduleId ? { ...schedule, [field]: value } : schedule
    ));
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleRemoveDiscount = (discountId: string) => {
    setSelectedDiscounts(prev => prev.filter(discount => discount.id !== discountId));
  };

  const handleRemovePaymentSchedule = (scheduleId: string) => {
    setSelectedPaymentSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
  };

  const handleContractTemplateSelect = (templateId: string) => {
    if (templateId === 'manual') {
      setSelectedContractTemplateId('');
      return;
    }
    
    const template = contractTemplates.find(t => t.id === templateId);
    if (template) {
      setContractTerms(template.content);
      setSelectedContractTemplateId(templateId);
    }
  };

  const handleEditTemplate = (template: InvoiceTemplate) => {
    setEditingTemplateId(template.id);
    setIsCreating(false);
    
    // Populate form with template data
    form.reset({
      name: template.name,
      description: template.description || '',
      contractTerms: template.contractTerms || '',
      notes: template.notes || '',
    });
    
    // Set selected items, discounts, payment schedules and contract terms
    setSelectedItems(template.items || []);
    setSelectedDiscounts(template.discounts || []);
    setSelectedPaymentSchedules(template.paymentSchedules || []);
    setContractTerms(template.contractTerms || '');
    setSelectedContractTemplateId('');
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    form.reset();
    setSelectedItems([]);
    setSelectedDiscounts([]);
    setSelectedPaymentSchedules([]);
    setContractTerms('');
    setSelectedContractTemplateId('');
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('invoice_templates')
        .delete()
        .eq('id', templateId);
        
      if (error) throw error;
      
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: TemplateFormValues) => {
    if (!selectedCompany || !user) {
      toast.error('Missing required context');
      return;
    }

    setIsLoading(true);
    try {
      // Format the template data for storage
      const content = JSON.stringify({
        items: selectedItems,
        discounts: selectedDiscounts,
        paymentSchedules: selectedPaymentSchedules,
        contractTerms: contractTerms,
        notes: values.notes
      });
      
      const templateData = {
        company_id: selectedCompany.id,
        user_id: user.id,
        name: values.name,
        description: values.description || null,
        content: content,
      };

      let result;
      
      if (editingTemplateId) {
        result = await supabase
          .from('invoice_templates')
          .update(templateData)
          .eq('id', editingTemplateId);
      } else {
        result = await supabase
          .from('invoice_templates')
          .insert(templateData);
      }

      if (result.error) throw result.error;
      
      toast.success(editingTemplateId ? 'Template updated successfully' : 'Template created successfully');
      loadTemplates();
      
      // Reset form and state
      form.reset();
      setSelectedItems([]);
      setSelectedDiscounts([]);
      setSelectedPaymentSchedules([]);
      setContractTerms('');
      setSelectedContractTemplateId('');
      setIsCreating(false);
      setEditingTemplateId(null);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Invoice Templates</h2>
        {!isCreating && !editingTemplateId && (
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Create Template
          </Button>
        )}
      </div>

      {(isCreating || editingTemplateId) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTemplateId ? 'Edit Invoice Template' : 'Create Invoice Template'}
            </CardTitle>
            <CardDescription>
              {editingTemplateId 
                ? 'Update your existing template with new items and terms'
                : 'Create a reusable template with predefined items and terms'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Wedding Package Basic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of this template" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Items Section */}
                <div className="space-y-4">
                  <FormLabel>Items</FormLabel>
                  <Tabs defaultValue="packages" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="packages">From Packages</TabsTrigger>
                      <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    </TabsList>
                    <TabsContent value="packages" className="space-y-2">
                      <PackageSelector onPackageSelect={handleItemsSelect} variant="direct-list" />
                    </TabsContent>
                    <TabsContent value="manual" className="space-y-2">
                      <Button type="button" onClick={handleAddCustomItem} variant="outline" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Custom Item
                      </Button>
                    </TabsContent>
                  </Tabs>
                  
                  {selectedItems.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium">Selected Items:</h4>
                      {selectedItems.map((item) => (
                        <div key={item.id} className="p-4 bg-muted rounded-md space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Item Name</label>
                              <Input
                                placeholder="Item name"
                                value={item.name}
                                onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity</label>
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Rate</label>
                                <Input
                                  type="number"
                                  placeholder="Rate"
                                  value={item.rate}
                                  onChange={(e) => handleUpdateItem(item.id, 'rate', Number(e.target.value))}
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                            <QuillEditor
                              value={item.description}
                              onChange={(value) => handleUpdateItem(item.id, 'description', value)}
                              placeholder="Item description..."
                              className="min-h-[100px]"
                            />
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium">
                              Total: ${item.amount.toFixed(2)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Discounts Section */}
                <div className="space-y-4">
                  <FormLabel>Discounts</FormLabel>
                  <Tabs defaultValue="templates" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="templates">From Templates</TabsTrigger>
                      <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    </TabsList>
                    <TabsContent value="templates" className="space-y-2">
                      <DiscountSelector onDiscountSelect={handleDiscountSelect} variant="direct-list" />
                    </TabsContent>
                    <TabsContent value="manual" className="space-y-2">
                      <Button type="button" onClick={handleAddCustomDiscount} variant="outline" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Custom Discount
                      </Button>
                    </TabsContent>
                  </Tabs>
                  
                  {selectedDiscounts.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium">Selected Discounts:</h4>
                      {selectedDiscounts.map((discount) => (
                        <div key={discount.id} className="p-4 bg-muted rounded-md space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Discount Name</label>
                              <Input
                                placeholder="Discount name"
                                value={discount.name}
                                onChange={(e) => handleUpdateDiscount(discount.id, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                              <Select
                                value={discount.type}
                                onValueChange={(value) => handleUpdateDiscount(discount.id, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                                  <SelectItem value="percentage">Percentage</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">
                                {discount.type === 'percentage' ? 'Percentage' : 'Amount'}
                              </label>
                              <Input
                                type="number"
                                placeholder={discount.type === 'percentage' ? 'e.g., 10' : 'e.g., 100'}
                                value={discount.amount}
                                onChange={(e) => handleUpdateDiscount(discount.id, 'amount', Number(e.target.value))}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-2 border-t">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDiscount(discount.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment Schedules Section */}
                <div className="space-y-4">
                  <FormLabel>Payment Schedules</FormLabel>
                  <Button type="button" onClick={handleAddPaymentSchedule} variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Payment Schedule
                  </Button>
                  
                  {selectedPaymentSchedules.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium">Payment Schedules:</h4>
                      {selectedPaymentSchedules.map((schedule) => (
                        <div key={schedule.id} className="p-4 bg-muted rounded-md space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                              <Input
                                placeholder="Payment description"
                                value={schedule.description}
                                onChange={(e) => handleUpdatePaymentSchedule(schedule.id, 'description', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Due Date</label>
                              <Input
                                type="date"
                                value={schedule.dueDate}
                                onChange={(e) => handleUpdatePaymentSchedule(schedule.id, 'dueDate', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1 block">Percentage (%)</label>
                              <Input
                                type="number"
                                placeholder="e.g., 50"
                                min="1"
                                max="100"
                                value={schedule.percentage}
                                onChange={(e) => handleUpdatePaymentSchedule(schedule.id, 'percentage', Number(e.target.value))}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-2 border-t">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePaymentSchedule(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contract Terms Section */}
                <div className="space-y-4">
                  <FormLabel>Contract Terms</FormLabel>
                  <Tabs defaultValue="templates" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="templates">From Templates</TabsTrigger>
                      <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    </TabsList>
                    <TabsContent value="templates" className="space-y-2">
                      <Select value={selectedContractTemplateId} onValueChange={handleContractTemplateSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a contract template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Enter manually</SelectItem>
                          {contractTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                    <TabsContent value="manual" className="space-y-2">
                      <p className="text-sm text-muted-foreground">Enter contract terms manually below</p>
                    </TabsContent>
                  </Tabs>
                  <QuillEditor
                    value={contractTerms}
                    onChange={setContractTerms}
                    placeholder="Enter contract terms here..."
                    className="min-h-[200px]"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Additional notes for invoices using this template"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (editingTemplateId) {
                        handleCancelEdit();
                      } else {
                        setIsCreating(false);
                        form.reset();
                        setSelectedItems([]);
                        setSelectedDiscounts([]);
                        setSelectedPaymentSchedules([]);
                        setContractTerms('');
                        setSelectedContractTemplateId('');
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (editingTemplateId ? 'Update Template' : 'Save Template')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {template.items && template.items.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Items:</h4>
                  <div className="space-y-1">
                    {template.items.map((item, index) => (
                      <div key={index} className="text-sm">
                        {item.name || item.productName} - ${item.rate} x {item.quantity}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {template.discounts && template.discounts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Discounts:</h4>
                  <div className="space-y-1">
                    {template.discounts.map((discount, index) => (
                      <div key={index} className="text-sm">
                        {discount.name} - {discount.type === 'percentage' ? `${discount.amount}%` : `$${discount.amount}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {template.paymentSchedules && template.paymentSchedules.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Payment Schedules:</h4>
                  <div className="space-y-1">
                    {template.paymentSchedules.map((schedule, index) => (
                      <div key={index} className="text-sm">
                        {schedule.description} - {schedule.percentage}% due {schedule.dueDate}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InvoiceTemplateSettings;
