
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
  className?: string
  placeholder?: string
  showPopover?: boolean
}

export function DatePicker({ 
  mode = "single", 
  selected, 
  onSelect, 
  initialFocus,
  className,
  placeholder = "Pick a date",
  showPopover = true
}: DatePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      {showPopover ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !selected && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selected instanceof Date 
                ? format(selected, "PPP") 
                : selected && 'from' in selected && selected.from 
                  ? `${format(selected.from, "PPP")}${selected.to ? ` - ${format(selected.to, "PPP")}` : ''}`
                  : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {mode === "single" ? (
              <Calendar
                mode="single"
                selected={selected as Date | null}
                onSelect={onSelect as (date: Date | null) => void}
                initialFocus={initialFocus}
              />
            ) : (
              <Calendar
                mode="range"
                selected={selected as DateRange | null}
                onSelect={onSelect as (range: DateRange | null) => void}
                initialFocus={initialFocus}
              />
            )}
          </PopoverContent>
        </Popover>
      ) : (
        mode === "single" ? (
          <Calendar
            mode="single"
            selected={selected as Date | null}
            onSelect={onSelect as (date: Date | null) => void}
            initialFocus={initialFocus}
          />
        ) : (
          <Calendar
            mode="range"
            selected={selected as DateRange | null}
            onSelect={onSelect as (range: DateRange | null) => void}
            initialFocus={initialFocus}
          />
        )
      )}
    </div>
  )
}
