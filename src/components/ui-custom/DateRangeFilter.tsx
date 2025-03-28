
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { CalendarRange } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onDateRangeChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClearFilter = () => {
    onDateRangeChange(undefined);
    setIsOpen(false);
  };

  // Format the date range for display
  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Filter by date';
    
    if (!range.to) {
      return `From ${format(range.from, 'PP')}`;
    }
    
    return `${format(range.from, 'PP')} to ${format(range.to, 'PP')}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="flex gap-2 items-center"
            aria-label="Filter by date range"
          >
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">{formatDateRange(dateRange)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            <h4 className="mb-2 font-medium">Filter by Date Range</h4>
            <DatePicker
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange as (range: DateRange | null) => void}
              initialFocus
              highlightToday
            />
            <div className="flex justify-end mt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilter}
                disabled={!dateRange?.from}
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;
