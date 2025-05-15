
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './CompanySelector';
import { useAuth } from '@/context/AuthContext';
import { Invoice, InvoiceTemplate } from '@/types';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}

const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({
  open,
  onOpenChange,
  invoice
}) => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Please provide a template name');
      return;
    }

    setIsSaving(true);

    try {
      // Create template content from invoice data
      const templateContent = {
        items: invoice.items || [],
        contractTerms: invoice.contractTerms || '',
        notes: invoice.notes || '',
        paymentSchedules: invoice.paymentSchedules || []
      };

      const newTemplate = {
        name: templateName,
        description: templateDescription,
        content: JSON.stringify(templateContent),
        user_id: user?.id,
        company_id: selectedCompany?.id
      };

      const { data, error } = await supabase
        .from('invoice_templates')
        .insert(newTemplate)
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      toast.success('Invoice template saved successfully!');
      setTemplateName('');
      setTemplateDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving invoice template:', error);
      toast.error('Failed to save invoice template');
    } finally {
      setIsSaving(false);
    }
  };

  const getItemsSummary = () => {
    const itemCount = invoice.items?.length || 0;
    const regularItems = invoice.items?.filter(item => item.rate >= 0).length || 0;
    const discountItems = invoice.items?.filter(item => item.rate < 0).length || 0;
    
    return `${itemCount} item${itemCount !== 1 ? 's' : ''} (${regularItems} product${regularItems !== 1 ? 's' : ''}, ${discountItems} discount${discountItems !== 1 ? 's' : ''})`;
  };

  const getPaymentScheduleSummary = () => {
    const scheduleCount = invoice.paymentSchedules?.length || 0;
    return `${scheduleCount} payment schedule${scheduleCount !== 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save as Invoice Template</DialogTitle>
          <DialogDescription>
            Create a reusable template from the current invoice content.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter a name for this template"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="templateDescription">Description (Optional)</Label>
            <Textarea
              id="templateDescription"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Enter a description for this template"
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2 bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium">Template will include:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {getItemsSummary()}</li>
              <li>• {invoice.contractTerms ? 'Contract terms' : 'No contract terms'}</li>
              <li>• {getPaymentScheduleSummary()}</li>
              <li>• {invoice.notes ? 'Notes' : 'No notes'}</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!templateName.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveAsTemplateDialog;
