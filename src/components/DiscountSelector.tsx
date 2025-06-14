
import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DollarSign, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DiscountTemplate, mapDiscountTemplateFromRow } from '@/components/discount/types';
import { useCompanyContext } from '@/context/CompanyContext';

interface DiscountItem {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

interface DiscountSelectorProps {
  onDiscountSelect: (items: DiscountItem[]) => void;
  variant?: 'dialog' | 'page' | 'direct-list';
  subtotal?: number;
}

const DiscountSelector: React.FC<DiscountSelectorProps> = ({
  onDiscountSelect,
  variant = 'page',
  subtotal = 0,
}) => {
  const [discounts, setDiscounts] = useState<DiscountTemplate[]>([]);
  const { selectedCompany } = useCompanyContext();

  useEffect(() => {
    const fetchDiscounts = async () => {
      const { data, error } = await supabase
        .from('discount_templates')
        .select('*')
        .eq('company_id', selectedCompany?.id);

      if (error) {
        console.error('Error fetching discount templates:', error);
        return;
      }

      setDiscounts((data || []).map(mapDiscountTemplateFromRow));
    };

    if (selectedCompany) {
      fetchDiscounts();
    }
  }, [selectedCompany]);

  const calculateDiscountAmount = (amount: number, type: 'fixed' | 'percentage') => {
    if (type === 'percentage') {
      return (subtotal * amount) / 100;
    }
    return amount;
  };

  const handleSelect = (discount: DiscountTemplate) => {
    const discountItem: DiscountItem = {
      id: `template-discount-${discount.id}`,
      name: discount.name,
      amount: Number(discount.amount),
      type: discount.type,
    };

    onDiscountSelect([discountItem]);
  };

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discounts.map((discount) => (
            <TableRow key={discount.id}>
              <TableCell className="font-medium">{discount.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {discount.type === 'percentage' ? (
                    <Percent className="h-4 w-4" />
                  ) : (
                    <DollarSign className="h-4 w-4" />
                  )}
                  {discount.amount}
                  {discount.type === 'percentage' && '%'}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {discount.description || '-'}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelect(discount)}
                >
                  Apply
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DiscountSelector;
