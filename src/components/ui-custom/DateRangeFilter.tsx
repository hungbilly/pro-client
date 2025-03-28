import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { CalendarRange, Check, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

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
  const [selectedPreset, setSelectedPreset] = useState<string>('All time');
  const [startDate, setStartDate] = useState<Date | undefined>(dateRange?.from);
  const [endDate, setEndDate] = useState<Date | undefined>(dateRange?.to);

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

  // Update the date range when the selected preset or custom dates change
  useEffect(() => {
    if (selectedPreset !== 'Custom range') {
      const preset = presets.find(p => p.label === selectedPreset);
      if (preset) {
        onDateRangeChange(preset.range);
        if (preset.range) {
          setStartDate(preset.range.from);
          setEndDate(preset.range.to);
        } else {
          setStartDate(undefined);
          setEndDate(undefined);
        }
      }
    } else if (startDate || endDate) {
      onDateRangeChange({ from: startDate, to: endDate });
    }
  }, [selectedPreset, startDate, endDate]);

  const handleClearFilter = () => {
    onDateRangeChange(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedPreset('All time');
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: PresetOption) => {
    setSelectedPreset(preset.label);
    
    if (preset.label !== 'Custom range') {
      onDateRangeChange(preset.range);
      if (preset.range) {
        setStartDate(preset.range.from);
        setEndDate(preset.range.to);
      } else {
        setStartDate(undefined);
        setEndDate(undefined);
      }
      setIsOpen(false);
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    const newStartDate = date || undefined;
    setStartDate(newStartDate);
    setSelectedPreset('Custom range');
    
    if (newStartDate && endDate) {
      onDateRangeChange({ from: newStartDate, to: endDate });
    } else if (newStartDate) {
      onDateRangeChange({ from: newStartDate, to: undefined });
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    const newEndDate = date || undefined;
    setEndDate(newEndDate);
    setSelectedPreset('Custom range');
    
    if (startDate && newEndDate) {
      onDateRangeChange({ from: startDate, to: newEndDate });
    } else if (startDate) {
      onDateRangeChange({ from: startDate, to: undefined });
    }
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
            className="flex gap-2 items-center min-w-[160px] justify-between"
            aria-label="Filter by date range"
          >
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              <span className="text-sm">{formatDateRange(dateRange)}</span>
            </div>
            <div className="text-muted-foreground opacity-70">
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] p-0" 
          align="start"
          sideOffset={8}
          style={{ maxHeight: '85vh', overflowY: 'auto' }}
        >
          <ScrollArea className="max-h-[85vh]">
            <div className="p-2">
              <div className="flex flex-col space-y-1">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start px-2 text-sm font-normal hover:bg-accent", 
                      selectedPreset === preset.label && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <Check 
                      className={`mr-2 h-4 w-4 ${selectedPreset === preset.label ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {preset.label}
                  </Button>
                ))}
              </div>
              
              {/* Show start date and end date inputs when "Custom range" is selected */}
              {selectedPreset === 'Custom range' && (
                <div className="p-3 space-y-3 border-t mt-1">
                  <div>
                    <p className="text-sm font-medium mb-1.5">Start date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {startDate ? (
                            format(startDate, 'PP')
                          ) : (
                            <span className="text-muted-foreground">Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => handleStartDateChange(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1.5">End date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {endDate ? (
                            format(endDate, 'PP')
                          ) : (
                            <span className="text-muted-foreground">Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => handleEndDateChange(date)}
                          initialFocus
                          disabled={(date) => startDate ? date < startDate : false}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
              
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={handleClearFilter}
                  disabled={!dateRange?.from}
                >
                  Clear Filter
                </Button>
              </div>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;
