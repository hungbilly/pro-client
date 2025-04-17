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
    
    // Apply theme colors to CSS variables
    const root = document.documentElement;
    
    // Set background colors
    root.style.setProperty('--background', theme.colors.background);
    root.style.setProperty('--module-background', theme.colors.moduleBackground);
    
    // Set text colors
    root.style.setProperty('--text', theme.colors.text);
    root.style.setProperty('--muted-text', theme.colors.mutedText);
    
    // Set accent color
    root.style.setProperty('--accent', theme.colors.accent);
    
    console.log(`Applied theme: ${themeName}`);
  };

  // Apply theme when company changes or when explicitly called
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
