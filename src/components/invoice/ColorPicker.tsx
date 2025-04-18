
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ColorPicker = ({ label, value, onChange, className }: ColorPickerProps) => {
  return (
    <div className={cn("flex flex-col space-y-1.5", className)}>
      <Label>{label}</Label>
      <div className="flex items-center space-x-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-8 p-0 cursor-pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
          placeholder="#000000"
        />
      </div>
    </div>
  );
};

export default ColorPicker;
