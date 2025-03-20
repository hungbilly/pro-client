
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import RichTextEditor from './RichTextEditor';

const ContractTemplateSettings = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    content: ''
  });
  const [editTemplate, setEditTemplate] = useState({
    name: '',
    description: '',
    content: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching contract templates:', error);
      toast.error('Failed to load contract templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      if (!newTemplate.name || !newTemplate.content) {
        toast.error('Template name and content are required');
        return;
      }

      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          name: newTemplate.name,
          description: newTemplate.description,
          content: newTemplate.content,
          user_id: (await supabase.auth.getUser()).data.user.id
        })
        .select();

      if (error) throw error;
      
      setTemplates([...templates, data[0]]);
      setNewTemplate({ name: '', description: '', content: '' });
      setIsCreating(false);
      toast.success('Contract template created successfully');
    } catch (error) {
      console.error('Error creating contract template:', error);
      toast.error('Failed to create contract template');
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      if (!editTemplate.name || !editTemplate.content) {
        toast.error('Template name and content are required');
        return;
      }

      const { error } = await supabase
        .from('contract_templates')
        .update({
          name: editTemplate.name,
          description: editTemplate.description,
          content: editTemplate.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      setTemplates(templates.map(template => 
        template.id === editingId ? { ...template, ...editTemplate } : template
      ));
      setEditingId(null);
      toast.success('Contract template updated successfully');
    } catch (error) {
      console.error('Error updating contract template:', error);
      toast.error('Failed to update contract template');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTemplates(templates.filter(template => template.id !== id));
      toast.success('Contract template deleted successfully');
    } catch (error) {
      console.error('Error deleting contract template:', error);
      toast.error('Failed to delete contract template');
    }
  };

  const startEdit = (template) => {
    setEditingId(template.id);
    setEditTemplate({
      name: template.name,
      description: template.description || '',
      content: template.content
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewTemplate({ name: '', description: '', content: '' });
  };

  if (loading) {
    return <div>Loading contract templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Contract Templates</h2>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Template
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="p-4 mb-4 border-2 border-primary/20">
          <h3 className="text-lg font-medium mb-4">Create New Template</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Template Name</label>
              <Input 
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="e.g., Standard Contract"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <Input 
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="Brief description of this template's purpose"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract Content</label>
              <RichTextEditor
                value={newTemplate.content}
                onChange={(value) => setNewTemplate({...newTemplate, content: value})}
                placeholder="Enter the contract text here..."
              />
            </div>
            <div className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={cancelCreate}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {templates.length === 0 && !isCreating ? (
          <div className="text-center py-8 text-muted-foreground">
            No contract templates found. Click "Add Template" to create your first contract template.
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="p-4">
              {editingId === template.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Template Name</label>
                    <Input 
                      value={editTemplate.name}
                      onChange={(e) => setEditTemplate({...editTemplate, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Input 
                      value={editTemplate.description}
                      onChange={(e) => setEditTemplate({...editTemplate, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contract Content</label>
                    <RichTextEditor
                      value={editTemplate.content}
                      onChange={(value) => setEditTemplate({...editTemplate, content: value})}
                    />
                  </div>
                  <div className="flex space-x-2 justify-end">
                    <Button variant="outline" onClick={cancelEdit}>
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button onClick={handleUpdateTemplate}>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium">{template.name}</h3>
                      {template.description && (
                        <p className="text-muted-foreground text-sm">{template.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: template.content }} />
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ContractTemplateSettings;
