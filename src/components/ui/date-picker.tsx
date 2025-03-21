
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
  popoverContentClassName?: string
  triggerContent?: React.ReactNode
}

export function DatePicker({ 
  mode = "single", 
  selected, 
  onSelect, 
  initialFocus,
  className,
  popoverContentClassName,
  triggerContent
}: DatePickerProps) {
  
  // If used as a standalone calendar without popover
  if (!triggerContent) {
    return (
      <div className={cn("grid gap-2", className)}>
        {mode === "single" ? (
          <Calendar
            mode="single"
            selected={selected as Date | null}
            onSelect={onSelect as (date: Date | null) => void}
            initialFocus={initialFocus}
            className="p-3 pointer-events-auto"
          />
        ) : (
          <Calendar
            mode="range"
            selected={selected as DateRange | null}
            onSelect={onSelect as (range: DateRange | null) => void}
            initialFocus={initialFocus}
            className="p-3 pointer-events-auto"
          />
        )}
      </div>
    )
  }
  
  // If used with popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        {triggerContent ? (
          triggerContent
        ) : (
          <Button 
            variant={"outline"} 
            className={cn(
              "w-full justify-start text-left font-normal",
              !selected && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {mode === "single" && selected ? (
              format(selected as Date, "PPP")
            ) : mode === "range" && selected ? (
              <>
                {format((selected as DateRange).from as Date, "PPP")} -{" "}
                {(selected as DateRange).to ? format((selected as DateRange).to as Date, "PPP") : ""}
              </>
            ) : (
              <span>Select date</span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", popoverContentClassName)} align="start">
        {mode === "single" ? (
          <Calendar
            mode="single"
            selected={selected as Date | null}
            onSelect={onSelect as (date: Date | null) => void}
            initialFocus={initialFocus}
            className="p-3 pointer-events-auto"
          />
        ) : (
          <Calendar
            mode="range"
            selected={selected as DateRange | null}
            onSelect={onSelect as (range: DateRange | null) => void}
            initialFocus={initialFocus}
            className="p-3 pointer-events-auto"
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
