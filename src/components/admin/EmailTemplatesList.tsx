
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const EmailTemplatesList = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Template ${currentStatus ? 'disabled' : 'enabled'}`);
      
      // Update the local state
      setTemplates(templates.map(template => 
        template.id === id ? {...template, is_active: !currentStatus} : template
      ));
    } catch (error) {
      console.error('Error updating template status:', error);
      toast.error('Failed to update template status');
    }
  };

  const handleEditTemplate = (id: string) => {
    navigate(`/admin/email-templates/edit/${id}`);
  };

  const handleCreateTemplate = () => {
    navigate('/admin/email-templates/new');
  };

  const handleTestTemplate = (id: string, templateName: string) => {
    navigate(`/admin/email-templates/test/${id}`, { state: { templateName } });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>Loading templates...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>Manage your system email templates</CardDescription>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" /> 
          Create Template
        </Button>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-muted-foreground mt-2">
              Create your first email template to start sending emails.
            </p>
            <Button onClick={handleCreateTemplate} className="mt-4">
              <Plus className="mr-2 h-4 w-4" /> 
              Create Template
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.category}</TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "success" : "secondary"}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(template.updated_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTestTemplate(template.id, template.name)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant={template.is_active ? "destructive" : "default"}
                        onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                      >
                        {template.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailTemplatesList;
