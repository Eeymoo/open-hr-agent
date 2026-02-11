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
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    updateCSSVariables(themeName);
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

function updateCSSVariables(themeName: ThemeName) {
  const theme = themeName === 'dark' ? darkTheme : lightTheme;
  const root = document.documentElement;

  root.style.setProperty('--bg-primary', theme.colors.bg.primary);
  root.style.setProperty('--bg-secondary', theme.colors.bg.secondary);
  root.style.setProperty('--bg-glass', theme.colors.bg.glass);
  root.style.setProperty('--bg-glass-light', theme.colors.bg['glass-light']);
  root.style.setProperty('--bg-glass-hover', theme.colors.bg['glass-hover']);

  root.style.setProperty('--text-primary', theme.colors.text.primary);
  root.style.setProperty('--text-secondary', theme.colors.text.secondary);
  root.style.setProperty('--text-muted', theme.colors.text.muted);

  root.style.setProperty('--border-glass', theme.colors.border.glass);
  root.style.setProperty('--border-glass-hover', theme.colors.border['glass-hover']);
  root.style.setProperty('--border-purple', theme.colors.border.purple);

  root.style.setProperty('--purple-main', theme.colors.purple.main);
  root.style.setProperty('--purple-light', theme.colors.purple.light);
  root.style.setProperty('--purple-dark', theme.colors.purple.dark);

  root.style.setProperty('--status-success', theme.colors.status.success);
  root.style.setProperty('--status-warning', theme.colors.status.warning);
  root.style.setProperty('--status-error', theme.colors.status.error);
  root.style.setProperty('--status-info', theme.colors.status.info);
}
