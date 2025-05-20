
import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-indigo-800",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white/80 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 p-0 opacity-70 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full",
        head_cell:
          "text-indigo-500 rounded-md w-9 font-medium text-[0.8rem] flex-1 flex justify-center",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative flex-1 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-indigo-50 hover:text-indigo-700"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white focus:bg-indigo-700 focus:text-white",
        day_today: "bg-violet-100 text-violet-800 font-medium",
        day_outside:
          "day-outside text-indigo-300 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-indigo-300 opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4 text-indigo-600" />,
        IconRight: () => <ChevronRight className="h-4 w-4 text-indigo-600" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
