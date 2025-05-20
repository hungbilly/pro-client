
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import DateRangeFilter from '@/components/ui-custom/DateRangeFilter';
import { DateRange } from 'react-day-picker';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
  return (
    <div className={`${isMobile ? 'mobile-header' : 'flex items-center justify-between'} mb-6`}>
      <h1 className={`text-3xl font-bold ${isMobile ? 'mb-3' : 'mb-0'}`}>Invoices</h1>
      <div className={`${isMobile ? 'mobile-actions' : 'flex gap-2'}`}>
        <Button onClick={onCreateInvoice} className="mobile-btn">
          <FileText className="mr-2 h-4 w-4" />
          <span>Create Invoice</span>
        </Button>
        <Button variant="outline" onClick={onExportOpen} className="mobile-btn">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
};

export default InvoicesToolbar;
