// ============================================
// MitrRAI - Theme Provider (Dark / Light Mode)
// ============================================

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mitrrai_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    // Add transition class for smooth color change
    document.documentElement.style.setProperty('transition', 'background-color 0.4s ease, color 0.3s ease');
    document.body.style.setProperty('transition', 'background-color 0.4s ease, color 0.3s ease');
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mitrrai_theme', next);
    // Remove transition after animation completes
    setTimeout(() => {
      document.documentElement.style.removeProperty('transition');
      document.body.style.removeProperty('transition');
    }, 500);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
