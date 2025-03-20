
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

type CountryType = {
  value: string;
  label: string;
};

const countries: CountryType[] = [
  { value: 'hk', label: 'Hong Kong' },
  { value: 'cn', label: 'China' },
  { value: 'mo', label: 'Macau' },
  { value: 'tw', label: 'Taiwan' },
  { value: 'sg', label: 'Singapore' },
  { value: 'my', label: 'Malaysia' },
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'au', label: 'Australia' },
  { value: 'jp', label: 'Japan' },
  { value: 'ca', label: 'Canada' },
  { value: 'in', label: 'India' },
  { value: 'br', label: 'Brazil' },
  { value: 'mx', label: 'Mexico' },
  { value: 'it', label: 'Italy' },
  { value: 'es', label: 'Spain' },
  { value: 'kr', label: 'South Korea' },
  { value: 'ru', label: 'Russia' },
  { value: 'za', label: 'South Africa' },
  { value: 'ch', label: 'Switzerland' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'be', label: 'Belgium' },
  { value: 'no', label: 'Norway' },
  { value: 'nz', label: 'New Zealand' },
  { value: 'ie', label: 'Ireland' },
  { value: 'dk', label: 'Denmark' },
  { value: 'fi', label: 'Finland' },
  { value: 'at', label: 'Austria' },
  { value: 'pt', label: 'Portugal' },
  { value: 'ae', label: 'United Arab Emirates' },
];

interface CountryDropdownProps {
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CountryDropdown({ value, onChange, disabled = false }: CountryDropdownProps) {
  const [open, setOpen] = useState(false);
  const safeValue = value || 'hk';

  const selectedCountry = countries.find((country) => country.value === safeValue);
  
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
          {selectedCountry ? selectedCountry.label : "Hong Kong"}
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
                  onChange(currentValue);
                  setOpen(false);
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
  );
}
