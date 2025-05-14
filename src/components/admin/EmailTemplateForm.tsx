
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

const EMAIL_CATEGORIES = [
  'welcome',
  'notification',
  'alert',
  'subscription',
  'marketing',
  'system',
  'other'
];

const EmailTemplateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [template, setTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'system',
    description: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      fetchTemplateDetails();
    }
  }, [id]);

  const fetchTemplateDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTemplate({
          name: data.name,
          subject: data.subject,
          body: data.body,
          category: data.category,
          description: data.description || '',
          is_active: data.is_active
        });
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast.error('Failed to load template details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplate(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setTemplate(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setTemplate(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      if (!template.name || !template.subject || !template.body || !template.category) {
        toast.error('Please fill all required fields');
        return;
      }

      if (isEditMode) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: template.name,
            subject: template.subject,
            body: template.body,
            category: template.category,
            description: template.description,
            is_active: template.is_active,
            updated_at: new Date()
          })
          .eq('id', id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert({
            name: template.name,
            subject: template.subject,
            body: template.body,
            category: template.category,
            description: template.description,
            is_active: template.is_active
          });

        if (error) throw error;
        toast.success('Template created successfully');
      }

      navigate('/admin/email-templates');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Template...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => navigate('/admin/email-templates')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{isEditMode ? 'Edit Email Template' : 'Create Email Template'}</CardTitle>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                name="name"
                placeholder="Welcome Email"
                value={template.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
              <Select 
                value={template.category} 
                onValueChange={(value) => handleSelectChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="Sent to users when they first sign up"
              value={template.description}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject <span className="text-red-500">*</span></Label>
            <Input
              id="subject"
              name="subject"
              placeholder="Welcome to our platform!"
              value={template.subject}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="body">Email Body <span className="text-red-500">*</span></Label>
            <Textarea
              id="body"
              name="body"
              placeholder="Hello {{name}},\n\nWelcome to our platform! We're excited to have you on board."
              value={template.body}
              onChange={handleChange}
              rows={10}
              required
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Use {{variable}} syntax for dynamic content. Example: Hello {{name}}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={template.is_active}
              onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active Template</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/admin/email-templates')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default EmailTemplateForm;
