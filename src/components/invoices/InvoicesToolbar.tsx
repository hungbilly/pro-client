
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import DateRangeFilter from '@/components/ui-custom/DateRangeFilter';
import { DateRange } from 'react-day-picker';

interface InvoicesToolbarProps {
  onCreateInvoice: () => void;
  onExportOpen: () => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const InvoicesToolbar: React.FC<InvoicesToolbarProps> = ({
  onCreateInvoice,
  onExportOpen,
  dateRange,
  onDateRangeChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
      <h1 className="text-3xl font-bold mb-4 sm:mb-0">Invoices</h1>
      <div className="flex gap-2">
        <Button onClick={onCreateInvoice}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Create New Invoice</span>
        </Button>
        <Button variant="outline" onClick={onExportOpen}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
};

export default InvoicesToolbar;
