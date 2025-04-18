
import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export const themes = [
  {
    id: 'oceanic-breeze',
    name: 'Oceanic Breeze',
    colors: {
      background: '195 20% 96%', // #EDF3F5
      moduleBackground: '0 0% 100%', // #FFFFFF
      titleBarBackground: '195 30% 90%', // #DCE6EA
      text: '200 50% 20%', // #1F3A5F
      mutedText: '200 30% 50%', // #5F7A99
      accent: '190 60% 50%', // #2AA8C8
      border: '195 20% 85%', // #D1DCE0
      buttonPrimary: '190 60% 50%', // #2AA8C8
      buttonPrimaryForeground: '0 0% 100%', // #FFFFFF
      hover: '190 60% 60%', // #4FC0E0
    },
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    colors: {
      background: '240 20% 12%', // #1B1F2E
      moduleBackground: '240 15% 18%', // #252B42
      titleBarBackground: '240 20% 24%', // #2F3557
      text: '240 10% 90%', // #D9DDE6
      mutedText: '240 10% 70%', // #A3A8C2
      accent: '270 60% 60%', // #8B5CF6
      border: '240 15% 30%', // #414B73
      buttonPrimary: '270 60% 60%', // #8B5CF6
      buttonPrimaryForeground: '0 0% 100%', // #FFFFFF
      hover: '270 60% 70%', // #A78BFA
    },
  },
  {
    id: 'soft-lavender',
    name: 'Soft Lavender',
    colors: {
      background: '270 20% 98%', // #F8F6FA
      moduleBackground: '0 0% 100%', // #FFFFFF
      titleBarBackground: '270 30% 94%', // #ECE8F1
      text: '270 50% 20%', // #4B2E5C
      mutedText: '270 30% 50%', // #806B99
      accent: '280 60% 60%', // #B794F4
      border: '270 20% 88%', // #E0DBE6
      buttonPrimary: '280 60% 60%', // #B794F4
      buttonPrimaryForeground: '0 0% 100%', // #FFFFFF
      hover: '280 60% 70%', // #C7A8F7
    },
  },
  {
    id: 'slate-graphite',
    name: 'Slate Graphite',
    colors: {
      background: '220 15% 10%', // #1A1F26
      moduleBackground: '220 10% 16%', // #252B33
      titleBarBackground: '220 15% 22%', // #2F3744
      text: '220 10% 90%', // #D9DDE2
      mutedText: '220 10% 65%', // #A3A8B2
      accent: '210 50% 60%', // #4C8EE2
      border: '220 10% 30%', // #414A56
      buttonPrimary: '210 50% 60%', // #4C8EE2
      buttonPrimaryForeground: '0 0% 100%', // #FFFFFF
      hover: '210 50% 70%', // #6DA4F0
    },
  },
  {
    id: 'golden-harvest',
    name: 'Golden Harvest',
    colors: {
      background: '45 30% 96%', // #F9F4E8
      moduleBackground: '0 0% 100%', // #FFFFFF
      titleBarBackground: '45 40% 90%', // #EFE7C7
      text: '30 50% 20%', // #593A22
      mutedText: '30 30% 50%', // #997966
      accent: '40 80% 50%', // #F2A72E
      border: '45 20% 85%', // #DAD4B5
      buttonPrimary: '40 80% 50%', // #F2A72E
      buttonPrimaryForeground: '0 0% 100%', // #FFFFFF
      hover: '40 80% 60%', // #F4B84F
    },
  },
];

interface ThemeSelectorProps {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ theme, setTheme }) => {
  const { allThemes } = useTheme();
  
  // Update the theme prop if it's not found in available themes
  useEffect(() => {
    const themeExists = allThemes.some(t => t.id === theme);
    if (!themeExists && allThemes.length > 0) {
      setTheme(allThemes[0].id);
    }
  }, [theme, allThemes, setTheme]);

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 opacity-70" />
          <SelectValue placeholder="Select a theme" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {allThemes.map(themeOption => (
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
