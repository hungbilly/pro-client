
import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { DateRange } from 'react-day-picker';

interface ExportDateRangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'xlsx', dateRange: DateRange | null) => void;
  title: string;
  description: string;
  count: number;
}

const ExportDateRangeDialog: React.FC<ExportDateRangeDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  title,
  description,
  count
}) => {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm mb-4">
            {count} record{count !== 1 ? 's' : ''} will be exported based on your current filters.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Select Date Range (Optional)</Label>
              <div className="border rounded-md p-4">
                <DatePicker
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange as (range: DateRange | null) => void}
                  highlightToday={true}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {dateRange?.from && dateRange?.to 
                  ? `Exporting data from ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
                  : dateRange?.from 
                  ? `Exporting data from ${dateRange.from.toLocaleDateString()}` 
                  : "No date range selected. All records will be exported."}
              </p>
            </div>
            
            <Separator />
            
            <div>
              <Label className="mb-2 block">Select Export Format</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center justify-center h-24 p-4"
                  onClick={() => {
                    onExport('csv', dateRange);
                    onClose();
                  }}
                >
                  <FileText className="h-8 w-8 mb-2 text-blue-500" />
                  <span>CSV Format</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center justify-center h-24 p-4"
                  onClick={() => {
                    onExport('xlsx', dateRange);
                    onClose();
                  }}
                >
                  <FileSpreadsheet className="h-8 w-8 mb-2 text-green-500" />
                  <span>Excel Format</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDateRangeDialog;
