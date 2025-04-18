
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/context/CompanyContext';
import { DiscountTemplate, InvoiceItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DiscountSelectorProps {
  onDiscountSelect: (items: InvoiceItem[]) => void;
  variant?: 'dialog' | 'direct-list';
  subtotal?: number;
}

const DiscountSelector: React.FC<DiscountSelectorProps> = ({ 
  onDiscountSelect, 
  variant = 'dialog',
  subtotal = 0,
}) => {
  const [templates, setTemplates] = useState<DiscountTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCompany } = useCompanyContext();

  useEffect(() => {
    loadDiscountTemplates();
  }, [selectedCompany]);

  const loadDiscountTemplates = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from('discount_templates')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading discount templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDiscount = (template: DiscountTemplate) => {
    const discountAmount = template.type === 'percentage' 
      ? (subtotal * template.amount) / 100
      : template.amount;

    const discountItem: InvoiceItem = {
      id: `discount-${template.id}`,
      name: template.name,
      description: template.description || template.name,
      quantity: 1,
      rate: -discountAmount,
      amount: -discountAmount,
    };

    onDiscountSelect([discountItem]);
  };

  if (loading) {
    return <div>Loading discounts...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => (
        <Card 
          key={template.id}
          className="p-4 cursor-pointer hover:bg-slate-50"
          onClick={() => handleSelectDiscount(template)}
        >
          <h3 className="font-medium">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
          <p className="text-sm font-medium mt-2">
            {template.type === 'percentage' 
              ? `${template.amount}% off`
              : `$${template.amount.toFixed(2)} off`}
          </p>
        </Card>
      ))}
    </div>
  );
};

export default DiscountSelector;
