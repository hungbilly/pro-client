
import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateRange } from 'react-day-picker';

interface ExportDateRangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'xlsx', dateRange: DateRange | null) => void;
  title: string;
  description: string;
  count: number;
}

const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

// Generate a range of years (from current year - 10 to current year)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);

const ExportDateRangeDialog: React.FC<ExportDateRangeDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  title,
  description,
  count
}) => {
  const [fromMonth, setFromMonth] = useState<string>("");
  const [fromYear, setFromYear] = useState<string>("");
  const [toMonth, setToMonth] = useState<string>("");
  const [toYear, setToYear] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // Reset selections when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFromMonth("");
      setFromYear("");
      setToMonth("");
      setToYear("");
      setDateRange(null);
    }
  }, [isOpen]);

  // Update the dateRange when dropdown selections change
  useEffect(() => {
    if (fromMonth && fromYear) {
      const fromDate = new Date(parseInt(fromYear), months.indexOf(fromMonth), 1);
      
      let toDate: Date | undefined;
      if (toMonth && toYear) {
        // Set to last day of selected month
        const lastDayOfMonth = new Date(parseInt(toYear), months.indexOf(toMonth) + 1, 0).getDate();
        toDate = new Date(parseInt(toYear), months.indexOf(toMonth), lastDayOfMonth);
      }
      
      setDateRange({ 
        from: fromDate, 
        to: toDate 
      });
    } else {
      setDateRange(null);
    }
  }, [fromMonth, fromYear, toMonth, toYear]);

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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={fromMonth} onValueChange={setFromMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {months.map((month) => (
                            <SelectItem key={`from-${month}`} value={month}>{month}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    
                    <Select value={fromYear} onValueChange={setFromYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {years.map((year) => (
                            <SelectItem key={`from-${year}`} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>To</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={toMonth} onValueChange={setToMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {months.map((month) => (
                            <SelectItem key={`to-${month}`} value={month}>{month}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    
                    <Select value={toYear} onValueChange={setToYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {years.map((year) => (
                            <SelectItem key={`to-${year}`} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
