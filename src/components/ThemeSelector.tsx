import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette } from 'lucide-react';

export const themes = [
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    colors: {
      background: '210 40% 98%',
      moduleBackground: '0 0% 100%',
      titleBarBackground: '210 60% 95%',
      text: '222 84% 10%',
      mutedText: '215 16% 47%',
      accent: '210 80% 50%',
      border: '214 32% 91%',
      buttonPrimary: '210 80% 50%',
      buttonPrimaryForeground: '0 0% 100%',
      hover: '210 80% 60%'
    }
  },
  {
    id: 'dark-emerald',
    name: 'Dark Emerald',
    colors: {
      background: '180 10% 10%',
      moduleBackground: '180 8% 15%',
      titleBarBackground: '180 10% 20%',
      text: '180 20% 90%',
      mutedText: '180 15% 65%',
      accent: '170 60% 45%',
      border: '180 10% 30%',
      buttonPrimary: '170 60% 45%',
      buttonPrimaryForeground: '180 20% 95%',
      hover: '170 60% 55%'
    }
  },
  {
    id: 'warm-sunset',
    name: 'Warm Sunset',
    colors: {
      background: '30 40% 98%',
      moduleBackground: '0 0% 100%',
      titleBarBackground: '30 50% 94%',
      text: '25 60% 20%',
      mutedText: '25 40% 50%',
      accent: '15 80% 60%',
      border: '30 30% 88%',
      buttonPrimary: '15 80% 60%',
      buttonPrimaryForeground: '0 0% 100%',
      hover: '15 80% 70%'
    }
  }
];

interface ThemeSelectorProps {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ theme, setTheme }) => {
  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 opacity-70" />
          <SelectValue placeholder="Select a theme" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {themes.map(themeOption => (
          <SelectItem 
            key={themeOption.id} 
            value={themeOption.id}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: `hsl(${themeOption.colors.background})` }}
                  title="Background"
                />
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: `hsl(${themeOption.colors.accent})` }}
                  title="Accent"
                />
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: `hsl(${themeOption.colors.buttonPrimary})` }}
                  title="Primary"
                />
              </div>
              <span>{themeOption.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ThemeSelector;
