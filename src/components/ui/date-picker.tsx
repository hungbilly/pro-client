
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

interface DatePickerProps {
  mode?: "single" | "range"
  selected?: Date | null
  onSelect?: (date: Date | null) => void
  initialFocus?: boolean
}

export function DatePicker({ mode = "single", selected, onSelect, initialFocus }: DatePickerProps) {
  return (
    <div className="grid gap-2">
      <Calendar
        mode={mode}
        selected={selected}
        onSelect={onSelect}
        initialFocus={initialFocus}
      />
    </div>
  )
}
