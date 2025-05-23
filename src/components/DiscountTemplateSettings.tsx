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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, PenLine } from 'lucide-react';
import { useCompanyContext } from '@/context/CompanyContext';
import { DiscountTemplate, mapDiscountTemplateFromRow } from './discount/types';
const discountFormSchema = z.object({
  name: z.string().min(1, "Discount name is required"),
  description: z.string().optional(),
  amount: z.number().min(0, "Amount must be positive")
});
type DiscountFormValues = z.infer<typeof discountFormSchema>;
const DiscountTemplateSettings = () => {
  const {
    user
  } = useAuth();
  const {
    selectedCompany
  } = useCompanyContext();
  const [templates, setTemplates] = useState<DiscountTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DiscountTemplate | null>(null);
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      name: '',
      description: '',
      amount: 0
    }
  });
  useEffect(() => {
    if (selectedCompany) {
      loadTemplates();
    }
  }, [selectedCompany]);
  useEffect(() => {
    if (editingTemplate) {
      form.reset({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        amount: editingTemplate.amount
      });
      setIsCreating(true);
    }
  }, [editingTemplate]);
  const loadTemplates = async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('discount_templates').select('*').eq('company_id', selectedCompany.id);
      if (error) throw error;
      setTemplates((data || []).map(mapDiscountTemplateFromRow));
    } catch (error) {
      console.error('Error loading discount templates:', error);
      toast.error('Failed to load discount templates');
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this discount template?")) {
      return;
    }
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.from('discount_templates').delete().eq('id', templateId);
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
  const handleEditTemplate = (template: DiscountTemplate) => {
    setEditingTemplate(template);
  };
  const onSubmit = async (values: DiscountFormValues) => {
    if (!selectedCompany || !user) {
      toast.error('Missing required context');
      return;
    }
    setIsLoading(true);
    try {
      const templateData = {
        company_id: selectedCompany.id,
        user_id: user.id,
        name: values.name,
        description: values.description || null,
        amount: values.amount,
        type: 'fixed' as const
      };
      if (editingTemplate) {
        const {
          error
        } = await supabase.from('discount_templates').update(templateData).eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('Discount template updated successfully');
      } else {
        const {
          error
        } = await supabase.from('discount_templates').insert(templateData);
        if (error) throw error;
        toast.success('Discount template created successfully');
      }
      loadTemplates();
      form.reset();
      setIsCreating(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Discount Items</h2>
        {!isCreating && <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Create Template
          </Button>}
      </div>

      {isCreating && <Card>
          <CardHeader>
            <CardTitle>{editingTemplate ? 'Edit' : 'Create'} Discount Template</CardTitle>
            <CardDescription>
              {editingTemplate ? 'Modify' : 'Create'} a reusable discount template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({
              field
            }) => <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Early Bird Discount" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="description" render={({
              field
            }) => <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of this discount" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="amount" render={({
              field
            }) => <FormItem>
                      <FormLabel>Fixed Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 100" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => {
                setIsCreating(false);
                setEditingTemplate(null);
                form.reset();
              }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Save Template'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => <Card key={template.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{template.name}</h3>
                  {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
                  <p className="text-sm font-medium mt-2">
                    ${Number(template.amount).toFixed(2)} off
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)}>
                    <PenLine className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>
    </div>;
};
export default DiscountTemplateSettings;