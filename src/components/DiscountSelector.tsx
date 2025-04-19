
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DollarSign, Percent } from 'lucide-react';
import { InvoiceItem } from '@/types';

// Define the discounts array that was missing
const discounts = [
  {
    id: '1',
    name: 'Early Payment',
    description: 'Discount for paying within 7 days',
    amount: 10,
    type: 'percentage',
  },
  {
    id: '2',
    name: 'New Client',
    description: 'Welcome discount for new clients',
    amount: 15,
    type: 'percentage',
  },
  {
    id: '3',
    name: 'Holiday Special',
    description: 'Special holiday season discount',
    amount: 50,
    type: 'fixed',
  },
  {
    id: '4',
    name: 'Loyalty Discount',
    description: 'For returning clients',
    amount: 5,
    type: 'percentage',
  }
];

interface DiscountSelectorProps {
  onDiscountSelect: (items: InvoiceItem[]) => void;
  variant?: 'dialog' | 'page';
  subtotal?: number;
}

const DiscountSelector: React.FC<DiscountSelectorProps> = ({
  onDiscountSelect,
  variant = 'page',
  subtotal = 0,
}) => {
  const calculateDiscountAmount = (amount: number, type: 'fixed' | 'percentage') => {
    if (type === 'percentage') {
      return (subtotal * amount) / 100;
    }
    return amount;
  };

  const handleSelect = (discount: any) => {
    const discountAmount = calculateDiscountAmount(
      discount.amount,
      discount.type as 'fixed' | 'percentage'
    );

    const discountItem: InvoiceItem = {
      id: `template-discount-${discount.id}`,
      name: discount.name,
      description: discount.description || 'Template discount',
      quantity: 1,
      rate: -discountAmount,
      amount: -discountAmount,
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
