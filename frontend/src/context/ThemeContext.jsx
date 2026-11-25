import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'mams-color-scheme';

function applyTheme(mode) {
  try {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.content = mode === 'light' || mode === 'dark' ? mode : 'light dark';
    }
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  } catch {
    // Ignore DOM errors
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch {
      return 'system';
    }
  });

  const setTheme = useCallback((nextMode) => {
    setThemeState(nextMode);
    try {
      if (nextMode === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, nextMode);
      }
    } catch {
      // Ignore storage failures
    }
    applyTheme(nextMode);
  }, []);

  useEffect(() => {
    applyTheme(theme);

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    media?.addEventListener?.('change', handleMediaChange);

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const synced = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : 'system';
        setThemeState(synced);
        applyTheme(synced);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      media?.removeEventListener?.('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
