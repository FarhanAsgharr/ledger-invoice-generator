import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadTheme, saveTheme } from '@/lib/storage';
import type { ThemeMode } from '@/types';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  /** True when the user has never chosen, so we follow the OS. */
  isSystem: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ThemeMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(mode);
  root.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#080B10' : '#EDF0F4');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<ThemeMode | null>(() => loadTheme());
  const [theme, setThemeState] = useState<ThemeMode>(() => loadTheme() ?? systemTheme());

  // Follow the OS until the user makes an explicit choice.
  useEffect(() => {
    if (stored || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setThemeState(event.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [stored]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    setStored(mode);
    saveTheme(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      setStored(next);
      saveTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, isSystem: stored === null }),
    [theme, setTheme, toggleTheme, stored],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
