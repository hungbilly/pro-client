import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type CurrencyType = {
  value: string;
  label: string;
  symbol: string;
};

const currencies: CurrencyType[] = [
  { value: 'hkd', label: 'Hong Kong Dollar', symbol: 'HK$' },
  { value: 'usd', label: 'US Dollar', symbol: '$' },
  { value: 'eur', label: 'Euro', symbol: '€' },
  { value: 'jpy', label: 'Japanese Yen', symbol: '¥' },
  { value: 'aud', label: 'Australian Dollar', symbol: 'A$' },
  { value: 'gbp', label: 'British Pound', symbol: '£' },
  { value: 'cad', label: 'Canadian Dollar', symbol: 'CA$' },
  { value: 'chf', label: 'Swiss Franc', symbol: 'CHF' },
  { value: 'cny', label: 'Chinese Yuan', symbol: '¥' },
  { value: 'inr', label: 'Indian Rupee', symbol: '₹' },
  { value: 'mxn', label: 'Mexican Peso', symbol: 'MX$' },
  { value: 'brl', label: 'Brazilian Real', symbol: 'R$' },
  { value: 'rub', label: 'Russian Ruble', symbol: '₽' },
  { value: 'krw', label: 'South Korean Won', symbol: '₩' },
  { value: 'sgd', label: 'Singapore Dollar', symbol: 'S$' },
  { value: 'nzd', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { value: 'sek', label: 'Swedish Krona', symbol: 'kr' },
  { value: 'zar', label: 'South African Rand', symbol: 'R' },
  { value: 'thb', label: 'Thai Baht', symbol: '฿' },
  { value: 'dkk', label: 'Danish Krone', symbol: 'kr' },
];

interface CurrencyDropdownProps {
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CurrencyDropdown({ value, onChange, disabled = false }: CurrencyDropdownProps) {
  const [open, setOpen] = useState(false);
  const safeValue = value || 'hkd';

  const selectedCurrency = currencies.find((currency) => currency.value === safeValue);
  
  const displayValue = selectedCurrency 
    ? `${selectedCurrency.symbol} ${selectedCurrency.label}` 
    : "HK$ Hong Kong Dollar";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {displayValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {currencies.map((currency) => (
              <CommandItem
                key={currency.value}
                value={currency.value}
                onSelect={(currentValue) => {
                  onChange(currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    safeValue === currency.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {currency.symbol} {currency.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
