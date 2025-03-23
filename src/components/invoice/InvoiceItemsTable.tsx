
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Copy } from 'lucide-react';
import { InvoiceItem } from '@/types';
import RichTextEditor from '@/components/RichTextEditor';

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onEditItem: (item: InvoiceItem) => void;
  onDuplicateItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  activeRowId: string | null;
  setActiveRowId: (id: string | null) => void;
  handleItemChange: (id: string, field: string, value: any) => void;
  handleDoneEditing: () => void;
  handleManualPackageEntry: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  items,
  onEditItem,
  onDuplicateItem,
  onRemoveItem,
  activeRowId,
  setActiveRowId,
  handleItemChange,
  handleDoneEditing,
  handleManualPackageEntry,
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
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                {activeRowId === item.id ? (
                  <RichTextEditor
                    value={item.description}
                    onChange={(value) => handleItemChange(item.id, 'description', value)}
                    className="border-none min-h-0 p-0"
                    placeholder="Add description..."
                    alwaysShowToolbar={true}
                    showDoneButton={true}
                    onDone={handleDoneEditing}
                  />
                ) : (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                    onClick={() => setActiveRowId(item.id)}
                  />
                )}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">0%</TableCell>
              <TableCell className="text-right">No Tax</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onDuplicateItem(item.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoiceItemsTable;
