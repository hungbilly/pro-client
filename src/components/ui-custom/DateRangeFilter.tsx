
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  buttonClassName?: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onDateRangeChange,
  buttonClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleClearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(undefined);
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range || !range.from) return 'Filter by date';
    
    if (range.to) {
      if (isMobile) {
        return `${format(range.from, 'MM/dd')} - ${format(range.to, 'MM/dd')}`;
      }
      return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d')}`;
    }
    
    if (isMobile) {
      return `${format(range.from, 'MM/dd')}`;
    }
    return `${format(range.from, 'MMM d')}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size={isMobile ? "mobile" : "default"} 
          className={`flex items-center justify-between gap-1 ${buttonClassName} ${isMobile ? 'w-full touch-manipulation' : ''}`}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className={dateRange ? 'text-foreground' : 'text-muted-foreground'}>
              {formatDateRange(dateRange)}
            </span>
          </div>
          {dateRange && (
            <X 
              className="h-4 w-4 text-muted-foreground hover:text-foreground" 
              onClick={handleClearFilter}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={isMobile ? 1 : 2}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeFilter;
