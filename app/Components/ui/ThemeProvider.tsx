'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isIncognito: boolean;
  setIncognito: (value: boolean) => void;
  toggleIncognito: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const fallback: ThemeContextType = {
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  isIncognito: false,
  setIncognito: () => {},
  toggleIncognito: () => {},
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isIncognito, setIncognitoState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('analyzeit-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const savedIncognito = sessionStorage.getItem('analyzeit-incognito') === '1';
    setIncognitoState(savedIncognito);
    document.documentElement.setAttribute('data-incognito', savedIncognito ? 'true' : 'false');
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('analyzeit-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const setIncognito = (value: boolean) => {
    setIncognitoState(value);
    sessionStorage.setItem('analyzeit-incognito', value ? '1' : '0');
    document.documentElement.setAttribute('data-incognito', value ? 'true' : 'false');
  };

  const toggleIncognito = () => setIncognito(!isIncognito);

  return (
    <ThemeContext.Provider
      value={{
        theme: mounted ? theme : 'light',
        toggleTheme,
        setTheme,
        isIncognito: mounted ? isIncognito : false,
        setIncognito,
        toggleIncognito,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  return context ?? fallback;
};
