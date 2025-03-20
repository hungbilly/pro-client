
import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Country {
  value: string
  label: string
}

// Common countries list
const countries: Country[] = [
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "uk", label: "United Kingdom" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
  { value: "jp", label: "Japan" },
  { value: "cn", label: "China" },
  { value: "in", label: "India" },
  { value: "br", label: "Brazil" },
  { value: "mx", label: "Mexico" },
  { value: "sg", label: "Singapore" },
  { value: "hk", label: "Hong Kong" },
  { value: "nz", label: "New Zealand" },
  { value: "za", label: "South Africa" },
  { value: "ae", label: "United Arab Emirates" },
  { value: "nl", label: "Netherlands" },
  { value: "se", label: "Sweden" },
  { value: "ch", label: "Switzerland" },
  { value: "no", label: "Norway" },
  { value: "dk", label: "Denmark" },
  { value: "fi", label: "Finland" },
  { value: "ie", label: "Ireland" },
  { value: "be", label: "Belgium" },
  { value: "at", label: "Austria" },
  { value: "pt", label: "Portugal" },
  { value: "gr", label: "Greece" },
  { value: "il", label: "Israel" },
  { value: "ru", label: "Russia" },
  { value: "kr", label: "South Korea" },
  { value: "tr", label: "Turkey" },
  { value: "th", label: "Thailand" },
  { value: "vn", label: "Vietnam" },
  { value: "id", label: "Indonesia" },
  { value: "my", label: "Malaysia" },
  { value: "ph", label: "Philippines" }
].sort((a, b) => a.label.localeCompare(b.label));

export interface CountryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CountryDropdown({
  value,
  onChange,
  placeholder = "Select country",
  disabled = false
}: CountryDropdownProps) {
  const [open, setOpen] = React.useState(false)
  
  // Get the country label for display
  const getCountryLabel = () => {
    if (!value) return placeholder;
    const country = countries.find((country) => country.value === value);
    return country ? country.label : value;
  }

  // Safely handle the value
  const safeValue = value || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {getCountryLabel()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {countries.map((country) => (
              <CommandItem
                key={country.value}
                value={country.value}
                onSelect={(currentValue) => {
                  onChange(currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    safeValue === country.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {country.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
