
import React, { createContext, useContext, useEffect } from 'react';
import { themes } from '@/components/ThemeSelector';
import { useCompany } from '@/components/CompanySelector';

interface ThemeContextType {
  applyTheme: (themeName: string) => void;
  currentTheme: string | null;
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
  const currentTheme = selectedCompany?.theme || 'modern-blue';

  const applyTheme = (themeName: string) => {
    const theme = themes.find(t => t.id === themeName) || themes[0];
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
    root.style.setProperty('--popover', theme.colors.moduleBackground);
    root.style.setProperty('--popover-foreground', theme.colors.text);
    root.style.setProperty('--primary', theme.colors.buttonPrimary);
    root.style.setProperty('--primary-foreground', theme.colors.buttonPrimaryForeground);
    root.style.setProperty('--muted-foreground', theme.colors.mutedText);
    root.style.setProperty('--accent-foreground', theme.colors.text);
    root.style.setProperty('--input', theme.colors.border);
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

  // Apply theme when company changes
  useEffect(() => {
    if (currentTheme) {
      console.log('ThemeProvider: Applying theme:', currentTheme);
      applyTheme(currentTheme);
    }
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ applyTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
