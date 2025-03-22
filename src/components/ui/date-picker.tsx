
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { type DateRange } from "react-day-picker"

interface DatePickerProps {
  mode?: "single" | "range"
  selected?: Date | DateRange | null
  onSelect?: ((date: Date | null) => void) | ((range: DateRange | null) => void)
  initialFocus?: boolean
  disabled?: boolean
  placeholder?: string
  highlightToday?: boolean
  classNames?: Record<string, string>
  id?: string
}

export function DatePicker({ 
  mode = "single", 
  selected, 
  onSelect, 
  initialFocus,
  disabled,
  placeholder = "Select date",
  highlightToday = false,
  classNames,
  id,
}: DatePickerProps) {
  const handleSelect = React.useCallback((value: Date | null | DateRange) => {
    if (onSelect) {
      if (mode === "single") {
        (onSelect as (date: Date | null) => void)(value as Date | null);
      } else {
        (onSelect as (range: DateRange | null) => void)(value as DateRange | null);
      }
    }
  }, [mode, onSelect]);

  return (
    <div className="grid gap-2">
      {mode === "single" ? (
        <Calendar
          id={id}
          mode="single"
          selected={selected as Date | null}
          onSelect={handleSelect as (date: Date | null) => void}
          initialFocus={initialFocus}
          disabled={disabled}
          className="pointer-events-auto"
        />
      ) : (
        <Calendar
          mode="range"
          selected={selected as DateRange | null}
          onSelect={handleSelect as (range: DateRange | null) => void}
          initialFocus={initialFocus}
          disabled={disabled}
          className="pointer-events-auto"
          classNames={{
            day_range_start: "bg-primary text-primary-foreground rounded-l-md",
            day_range_end: "bg-primary text-primary-foreground rounded-r-md",
            day_range_middle: "bg-primary/20 text-primary-foreground rounded-none",
            ...classNames,
          }}
          today={highlightToday ? new Date() : undefined}
        />
      )}
    </div>
  )
}
