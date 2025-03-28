
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { CalendarRange, Check } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

type PresetOption = {
  label: string;
  range: DateRange | undefined;
};

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onDateRangeChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Preset date ranges
  const presets = useMemo(() => {
    const now = new Date();
    const thisMonth = {
      from: startOfMonth(now),
      to: endOfMonth(now)
    };
    const lastMonth = {
      from: startOfMonth(subMonths(now, 1)),
      to: endOfMonth(subMonths(now, 1))
    };
    const thisYear = {
      from: startOfYear(now),
      to: endOfYear(now)
    };

    return [
      { label: 'All time', range: undefined },
      { label: 'This month', range: thisMonth },
      { label: 'Last month', range: lastMonth },
      { label: 'This year', range: thisYear },
      { label: 'Custom range', range: null },
    ] as PresetOption[];
  }, []);

  const handleClearFilter = () => {
    onDateRangeChange(undefined);
    setShowCustomRange(false);
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: PresetOption) => {
    if (preset.label === 'Custom range') {
      setShowCustomRange(true);
      return;
    }
    
    onDateRangeChange(preset.range);
    setShowCustomRange(false);
    setIsOpen(false);
  };

  // Get the current preset label
  const getCurrentPresetLabel = (): string => {
    if (!dateRange?.from) return 'All time';
    
    // Try to match with one of our presets
    for (const preset of presets) {
      if (preset.range && 
          preset.range.from && dateRange.from && 
          preset.range.to && dateRange.to && 
          preset.range.from.getTime() === dateRange.from.getTime() && 
          preset.range.to.getTime() === dateRange.to.getTime()) {
        return preset.label;
      }
    }
    
    return 'Custom range';
  };

  // Format the date range for display in button
  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'All time';
    
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
            
            {/* Preset selection */}
            <ScrollArea className="h-[180px]">
              <div className="flex flex-col space-y-1 p-1">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className="justify-start font-normal"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <Check 
                      className={`mr-2 h-4 w-4 ${getCurrentPresetLabel() === preset.label ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {preset.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            
            {/* Custom date range picker */}
            {showCustomRange && (
              <div className="pt-4">
                <DatePicker
                  mode="range"
                  selected={dateRange}
                  onSelect={onDateRangeChange as (range: DateRange | null) => void}
                  initialFocus
                  highlightToday
                />
              </div>
            )}
            
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
