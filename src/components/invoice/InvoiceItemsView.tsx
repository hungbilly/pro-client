
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceItem } from '@/types';

interface InvoiceItemsViewProps {
  items: InvoiceItem[];
  formatCurrency: (amount: number) => string;
}

const InvoiceItemsView: React.FC<InvoiceItemsViewProps> = ({
  items,
  formatCurrency
}) => {
  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-16">Item</TableHead>
            <TableHead className="w-full">Description</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Discount</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">0%</TableCell>
              <TableCell className="text-right">No Tax</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoiceItemsView;
