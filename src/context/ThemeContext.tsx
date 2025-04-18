
import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes } from '@/components/ThemeSelector';
import { useCompany } from '@/components/CompanySelector';
import { supabase } from '@/integrations/supabase/client';

interface ThemeColors {
  background: string;
  moduleBackground: string;
  titleBarBackground: string;
  text: string;
  mutedText: string;
  accent: string;
  border: string;
  buttonPrimary: string;
  buttonPrimaryForeground: string;
  hover: string;
}

interface ThemeData {
  id: string;
  name: string;
  colors: ThemeColors;
}

interface ThemeContextType {
  applyTheme: (themeName: string) => void;
  currentTheme: string | null;
  allThemes: ThemeData[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedCompany } = useCompany();
  const currentTheme = selectedCompany?.theme || 'oceanic-breeze';
  const [dbThemes, setDbThemes] = useState<ThemeData[]>([]);

  // Load themes from database
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const { data, error } = await supabase.from('themes').select('*');
        if (error) {
          console.error('Error loading themes:', error);
          return;
        }
        
        if (data && data.length > 0) {
          setDbThemes(data);
        }
      } catch (error) {
        console.error('Error fetching themes:', error);
      }
    };
    
    fetchThemes();
  }, []);

  // Combined themes from static list and database
  const allThemes = [
    ...themes.map(theme => ({
      id: theme.id,
      name: theme.name,
      colors: theme.colors,
    })),
    ...dbThemes.filter(dbTheme => 
      // Filter out duplicates by ID
      !themes.some(theme => theme.id === dbTheme.id)
    )
  ];

  const applyTheme = (themeName: string) => {
    // First check database themes
    let theme = dbThemes.find(t => t.id === themeName);
    
    // If not found, check static themes
    if (!theme) {
      const staticTheme = themes.find(t => t.id === themeName);
      if (staticTheme) {
        theme = {
          id: staticTheme.id,
          name: staticTheme.name,
          colors: staticTheme.colors,
        };
      } else {
        // Fallback to first theme
        theme = allThemes[0];
      }
    }
    
    const root = document.documentElement;
    
    // Set CSS custom properties using HSL values
    root.style.setProperty('--background', theme.colors.background);
    root.style.setProperty('--module-background', theme.colors.moduleBackground);
    root.style.setProperty('--title-bar-background', theme.colors.titleBarBackground);
    root.style.setProperty('--text', theme.colors.text);
    root.style.setProperty('--muted-text', theme.colors.mutedText);
    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--border', theme.colors.border);
    root.style.setProperty('--button-primary', theme.colors.buttonPrimary);
    root.style.setProperty('--button-primary-foreground', theme.colors.buttonPrimaryForeground);
    root.style.setProperty('--hover', theme.colors.hover);
    
    // Also set the fallback variables that reference the primary ones
    root.style.setProperty('--foreground', theme.colors.text);
    root.style.setProperty('--card', theme.colors.moduleBackground);
    root.style.setProperty('--card-foreground', theme.colors.text);
    
    // Determine if this is a dark theme by checking lightness value in the background color
    const bgLightness = parseInt(theme.colors.background.split(' ')[2]);
    const isDarkTheme = bgLightness < 50;
    
    if (isDarkTheme) {
      // For dark themes, use a much lighter background for inputs to create better contrast
      root.style.setProperty('--input', '220 15% 30%'); // Significantly lighter than background for better visibility
      root.style.setProperty('--input-foreground', '0 0% 100%'); // Pure white text for maximum contrast
      
      // For dropdowns and popovers in dark themes, use the same lighter treatment
      root.style.setProperty('--popover', '220 15% 25%'); // Slightly lighter than module background
      root.style.setProperty('--popover-foreground', '0 0% 100%'); // White text for maximum contrast
      
      // Set a strong accent color for selections in dark mode to make them visible
      root.style.setProperty('--accent', theme.colors.accent);
      root.style.setProperty('--accent-foreground', '0 0% 100%');
    } else {
      // For light themes, use a slightly darker background than module background for better contrast
      root.style.setProperty('--input', '0 0% 98%'); // Almost white, but slightly off-white
      root.style.setProperty('--input-foreground', theme.colors.text);
      
      // For light themes, use a clean white background for dropdowns
      root.style.setProperty('--popover', '0 0% 100%'); // Clean white
      root.style.setProperty('--popover-foreground', theme.colors.text); // Regular text color
      
      // Set accent colors for light themes
      root.style.setProperty('--accent', theme.colors.accent);
      root.style.setProperty('--accent-foreground', '0 0% 100%');
    }
    
    root.style.setProperty('--ring', theme.colors.accent);

    // Set sidebar-specific variables
    root.style.setProperty('--sidebar-background', theme.colors.moduleBackground);
    root.style.setProperty('--sidebar-foreground', theme.colors.text);
    root.style.setProperty('--sidebar-primary', theme.colors.accent);
    root.style.setProperty('--sidebar-primary-foreground', theme.colors.buttonPrimaryForeground);
    root.style.setProperty('--sidebar-accent', theme.colors.background);
    root.style.setProperty('--sidebar-accent-foreground', theme.colors.text);
    root.style.setProperty('--sidebar-border', theme.colors.border);
    root.style.setProperty('--sidebar-ring', theme.colors.accent);
    
    console.log(`Applied theme: ${themeName}`);
  };

  // Apply theme when company changes or when themes are loaded
  useEffect(() => {
    if (currentTheme) {
      console.log('ThemeProvider: Applying theme:', currentTheme);
      applyTheme(currentTheme);
    }
  }, [currentTheme, dbThemes]);

  return (
    <ThemeContext.Provider value={{ applyTheme, currentTheme, allThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
