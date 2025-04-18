
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  onChange: (theme: string) => void;
  theme?: string; // Keep for backward compatibility
  setTheme?: (theme: string) => void; // Keep for backward compatibility
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  value, 
  onChange, 
  theme = value, // Use value as fallback
  setTheme = onChange // Use onChange as fallback
}) => {
  // Use either the value/onChange or theme/setTheme props
  const currentTheme = theme || value;
  const handleThemeChange = setTheme || onChange;
  
  return (
    <Select value={currentTheme} onValueChange={handleThemeChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a theme">
          {themes.find(t => t.id === currentTheme)?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {themes.map(themeOption => (
          <SelectItem 
            key={themeOption.id} 
            value={themeOption.id}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              {['background', 'accent', 'buttonPrimary'].map(colorKey => (
                <div 
                  key={colorKey}
                  className="w-4 h-4 rounded-sm mr-1"
                  style={{ 
                    backgroundColor: themeOption.colors[colorKey],
                    boxShadow: 'inset 0 0 1px rgba(0,0,0,0.3)'
                  }}
                />
              ))}
              <span>{themeOption.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ThemeSelector;
