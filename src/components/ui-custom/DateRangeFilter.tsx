
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
    setShowCustomRange(false);
  };

  const handlePresetSelect = (preset: PresetOption) => {
    setSelectedPreset(preset.label);
    
    if (preset.label === 'Custom range') {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
      onDateRangeChange(preset.range);
      if (preset.range) {
        setStartDate(preset.range.from);
        setEndDate(preset.range.to);
      } else {
        setStartDate(undefined);
        setEndDate(undefined);
      }
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

  const getActiveState = (label: string) => {
    return selectedPreset === label;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex flex-wrap gap-2 mb-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={getActiveState(preset.label) ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetSelect(preset)}
            className={cn(
              "py-1 h-8 px-3 text-xs",
              getActiveState(preset.label) ? "bg-primary text-primary-foreground" : ""
            )}
          >
            {preset.label}
          </Button>
        ))}
        
        {dateRange && dateRange.from && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilter}
            className="py-1 h-8 px-3 text-xs"
          >
            Clear
          </Button>
        )}
      </div>
      
      {showCustomRange && (
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-start text-left font-normal text-xs h-9"
              >
                {startDate ? (
                  format(startDate, 'PP')
                ) : (
                  <span className="text-muted-foreground">Start date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4} alignOffset={0} avoidCollisions>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => handleStartDateChange(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-start text-left font-normal text-xs h-9"
              >
                {endDate ? (
                  format(endDate, 'PP')
                ) : (
                  <span className="text-muted-foreground">End date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4} alignOffset={0} avoidCollisions>
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
      )}
      
      {dateRange && dateRange.from && (
        <div className="mt-2">
          <Badge variant="outline" className="bg-muted/50 text-xs px-2 py-0.5">
            {formatDateRange(dateRange)}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
