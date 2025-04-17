
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Define our theme palettes with descriptive names and color values
export const themes = [
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    colors: {
      background: '#F1F5F9',
      moduleBackground: '#FFFFFF',
      accent: '#3B82F6',
      text: '#1E293B',
      mutedText: '#64748B'
    }
  },
  {
    id: 'warm-terra',
    name: 'Warm Terra',
    colors: {
      background: '#FEF7F2',
      moduleBackground: '#FFFFFF',
      accent: '#F97316',
      text: '#422006',
      mutedText: '#9A7C6A'
    }
  },
  {
    id: 'deep-purple',
    name: 'Deep Purple',
    colors: {
      background: '#F3F0FF',
      moduleBackground: '#FFFFFF',
      accent: '#8B5CF6',
      text: '#2E1065',
      mutedText: '#7C3AED'
    }
  },
  {
    id: 'elegant-green',
    name: 'Elegant Green',
    colors: {
      background: '#F0FDF4',
      moduleBackground: '#FFFFFF',
      accent: '#10B981',
      text: '#064E3B',
      mutedText: '#6EE7B7'
    }
  }
];

interface ThemeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ value, onChange }) => {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4"
    >
      {themes.map((theme) => (
        <div 
          key={theme.id}
          className={`
            relative flex flex-col border rounded-lg p-4 cursor-pointer transition-all
            ${value === theme.id ? 'ring-2 ring-primary' : 'hover:border-primary/50'}
          `}
          style={{ background: theme.colors.moduleBackground }}
          onClick={() => onChange(theme.id)}
        >
          <RadioGroupItem
            value={theme.id}
            id={`theme-${theme.id}`}
            className="absolute top-4 right-4"
          />
          <div className="mb-4">
            <Label 
              htmlFor={`theme-${theme.id}`}
              className="font-medium mb-2 text-lg"
              style={{ color: theme.colors.text }}
            >
              {theme.name}
            </Label>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(theme.colors).map(([key, color]) => (
              <div key={key} className="flex flex-col items-center">
                <div 
                  className="w-6 h-6 rounded border border-gray-200" 
                  style={{ backgroundColor: color }}
                  title={`${key}: ${color}`}
                />
              </div>
            ))}
          </div>

          {/* Preview card */}
          <div 
            className="border rounded-md p-3 text-sm mb-2"
            style={{ background: theme.colors.moduleBackground, color: theme.colors.text }}
          >
            <div className="font-medium mb-1" style={{ color: theme.colors.text }}>
              Preview Card
            </div>
            <div className="text-xs" style={{ color: theme.colors.mutedText }}>
              This is how text will appear in modules
            </div>
            <div 
              className="mt-2 text-xs px-2 py-1 rounded-md inline-flex"
              style={{ background: theme.colors.accent, color: 'white' }}
            >
              Button
            </div>
          </div>
        </div>
      ))}
    </RadioGroup>
  );
};

export default ThemeSelector;
