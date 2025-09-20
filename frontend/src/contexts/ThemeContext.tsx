import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
type ActualTheme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  themeMode: ThemeMode;
  actualTheme: ActualTheme;
  fontSize: FontSize;
  reducedMotion: boolean;
  highContrast: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [actualTheme, setActualTheme] = useState<ActualTheme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Get system theme preference
  const getSystemTheme = (): ActualTheme => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Update actual theme based on mode
  useEffect(() => {
    if (themeMode === 'system') {
      setActualTheme(getSystemTheme());
    } else {
      setActualTheme(themeMode as ActualTheme);
    }
  }, [themeMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        if (themeMode === 'system') {
          setActualTheme(getSystemTheme());
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  // Load saved preferences
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('themeMode');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeMode(savedTheme as ThemeMode);
      }

      const savedFontSize = localStorage.getItem('fontSize');
      if (savedFontSize && ['small', 'medium', 'large'].includes(savedFontSize)) {
        setFontSize(savedFontSize as FontSize);
      }

      const savedReducedMotion = localStorage.getItem('reducedMotion');
      if (savedReducedMotion) {
        setReducedMotion(savedReducedMotion === 'true');
      }

      const savedHighContrast = localStorage.getItem('highContrast');
      if (savedHighContrast) {
        setHighContrast(savedHighContrast === 'true');
      }
    } catch (error) {
      console.warn('Failed to load theme preferences:', error);
    }
  }, []);

  // Save preferences
  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('themeMode', mode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const handleSetFontSize = (size: FontSize) => {
    setFontSize(size);
    try {
      localStorage.setItem('fontSize', size);
    } catch (error) {
      console.warn('Failed to save font size preference:', error);
    }
  };

  const handleSetReducedMotion = (enabled: boolean) => {
    setReducedMotion(enabled);
    try {
      localStorage.setItem('reducedMotion', enabled.toString());
    } catch (error) {
      console.warn('Failed to save reduced motion preference:', error);
    }
  };

  const handleSetHighContrast = (enabled: boolean) => {
    setHighContrast(enabled);
    try {
      localStorage.setItem('highContrast', enabled.toString());
    } catch (error) {
      console.warn('Failed to save high contrast preference:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        actualTheme,
        fontSize,
        reducedMotion,
        highContrast,
        setThemeMode: handleSetThemeMode,
        setFontSize: handleSetFontSize,
        setReducedMotion: handleSetReducedMotion,
        setHighContrast: handleSetHighContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useCustomTheme must be used within a ThemeProvider');
  }
  return context;
};