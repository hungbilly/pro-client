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
import { Plus, Save, Trash2 } from 'lucide-react';
import { useCompanyContext } from '@/context/CompanyContext';
import { InvoiceTemplate, InvoiceItem } from '@/types';
import PackageSelector from './PackageSelector';

// Schema for template form
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  contractTerms: z.string().optional(),
  notes: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const InvoiceTemplateSettings = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);

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
    }
  }, [selectedCompany]);

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

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
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
        contractTerms: values.contractTerms,
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
      if (!editingTemplateId) {
        form.reset();
        setSelectedItems([]);
        setIsCreating(false);
      }
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
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Create Template
          </Button>
        )}
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create Invoice Template</CardTitle>
            <CardDescription>
              Create a reusable template with predefined items and terms
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

                <div className="space-y-2">
                  <FormLabel>Items</FormLabel>
                  <PackageSelector onPackageSelect={handleItemsSelect} variant="direct-list" />
                  
                  {selectedItems.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.quantity} x ${item.rate} = ${item.amount}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="contractTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Terms (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Default contract terms for this template"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      setIsCreating(false);
                      form.reset();
                      setSelectedItems([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Template'}
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InvoiceTemplateSettings;
