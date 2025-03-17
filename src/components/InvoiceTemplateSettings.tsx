
import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Save, Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

// Schema for template form
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  content: z.string().min(1, "Template content is required"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

const InvoiceTemplateSettings = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      content: '',
    }
  });

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load invoice templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTemplate = (template: Template) => {
    form.reset({
      name: template.name,
      description: template.description || '',
      content: template.content,
    });
    setEditingTemplateId(template.id);
    setIsCreatingNew(false);
  };

  const handleCreateNew = () => {
    form.reset({
      name: '',
      description: '',
      content: '',
    });
    setEditingTemplateId(null);
    setIsCreatingNew(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const { error } = await supabase
        .from('invoice_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Template deleted successfully');
      loadTemplates();
      
      if (editingTemplateId === id) {
        form.reset();
        setEditingTemplateId(null);
        setIsCreatingNew(false);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const onSubmit = async (values: TemplateFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const templateData = {
        user_id: user.id,
        name: values.name,
        description: values.description || null,
        content: values.content,
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
      
      // Reset form
      if (!editingTemplateId) {
        form.reset();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && templates.length === 0) {
    return <div className="text-center p-4">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Invoice Templates</h3>
        <Button onClick={handleCreateNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          {templates.length === 0 ? (
            <div className="text-center p-4 border rounded-md">
              No templates yet. Create your first template.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(template => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer ${editingTemplateId === template.id ? 'border-primary' : ''}`}
                  onClick={() => handleEditTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          {(isCreatingNew || editingTemplateId) && (
            <Card>
              <CardHeader>
                <CardTitle>{editingTemplateId ? 'Edit Template' : 'Create New Template'}</CardTitle>
                <CardDescription>
                  {editingTemplateId 
                    ? 'Update your invoice template details' 
                    : 'Create a new invoice template to use when generating invoices'}
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
                            <Input placeholder="e.g. Standard Invoice" {...field} />
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
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Content</FormLabel>
                          <FormControl>
                            <RichTextEditor 
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Enter your template content here..."
                              className="min-h-[200px]"
                            />
                          </FormControl>
                          <FormDescription>
                            You can use placeholders like {'{client_name}'}, {'{invoice_number}'}, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Template'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplateSettings;
