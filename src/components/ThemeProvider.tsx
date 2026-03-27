// ============================================
// MitrRAI - Theme Provider (Always Dark)
// ============================================

'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';

interface ThemeContextValue {
  theme: 'dark';
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
  // Always dark — force on mount and clear any saved preference
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.removeItem('mitrrai_theme');
    localStorage.removeItem('theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}
