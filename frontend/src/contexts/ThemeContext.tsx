import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'app-theme';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
  } catch { /* ignore */ }
  return 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(getSystemTheme);

  const resolved = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [resolved, theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const r = prev === 'system' ? systemTheme : prev;
      return r === 'dark' ? 'light' : 'dark';
    });
  }, [systemTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
