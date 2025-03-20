
import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Currency {
  value: string
  label: string
  symbol: string
}

// List of common currencies
const currencies: Currency[] = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "JPY", label: "Japanese Yen", symbol: "¥" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { value: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { value: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { value: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { value: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
  { value: "SEK", label: "Swedish Krona", symbol: "kr" },
  { value: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { value: "NOK", label: "Norwegian Krone", symbol: "kr" },
  { value: "MXN", label: "Mexican Peso", symbol: "$" },
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "BRL", label: "Brazilian Real", symbol: "R$" },
  { value: "RUB", label: "Russian Ruble", symbol: "₽" },
  { value: "ZAR", label: "South African Rand", symbol: "R" },
  { value: "TRY", label: "Turkish Lira", symbol: "₺" },
  { value: "KRW", label: "South Korean Won", symbol: "₩" },
  { value: "PLN", label: "Polish Złoty", symbol: "zł" },
  { value: "THB", label: "Thai Baht", symbol: "฿" },
  { value: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { value: "HUF", label: "Hungarian Forint", symbol: "Ft" },
  { value: "CZK", label: "Czech Koruna", symbol: "Kč" },
  { value: "ILS", label: "Israeli New Shekel", symbol: "₪" },
  { value: "CLP", label: "Chilean Peso", symbol: "$" },
  { value: "PHP", label: "Philippine Peso", symbol: "₱" },
  { value: "AED", label: "United Arab Emirates Dirham", symbol: "د.إ" },
  { value: "COP", label: "Colombian Peso", symbol: "$" },
  { value: "SAR", label: "Saudi Riyal", symbol: "ر.س" },
  { value: "MYR", label: "Malaysian Ringgit", symbol: "RM" },
  { value: "RON", label: "Romanian Leu", symbol: "lei" }
].sort((a, b) => a.label.localeCompare(b.label));

export interface CurrencyDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CurrencyDropdown({
  value,
  onChange,
  placeholder = "Select currency",
  disabled = false
}: CurrencyDropdownProps) {
  const [open, setOpen] = React.useState(false)
  
  const selectedCurrency = currencies.find((currency) => currency.value === value);
  const displayValue = selectedCurrency ? 
    `${selectedCurrency.label} (${selectedCurrency.symbol})` : 
    placeholder;

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
          {displayValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {currencies.map((currency) => (
              <CommandItem
                key={currency.value}
                value={currency.value}
                onSelect={(currentValue) => {
                  onChange(currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === currency.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {currency.label} ({currency.symbol})
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
