import React, { createContext, useContext, useEffect, useState } from 'react';
import { darkTheme } from '../../themes/dark';
import { lightTheme } from '../../themes/light';
import type { Theme } from '../../types/theme';

type ThemeName = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  toggleTheme: () => void;
  setTheme(_themeName: ThemeName): void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'hr-agent-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }, [themeName]);

  const toggleTheme = () => {
    setThemeNameState((prev) => {
      if (prev === 'dark') {
        return 'light';
      }
      return 'dark';
    });
  };

  const setTheme = (newThemeName: ThemeName) => {
    setThemeNameState(newThemeName);
  };

  const theme = themeName === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeName, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
