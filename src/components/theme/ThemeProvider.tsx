"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  // The inline boot script in app/layout.tsx already set data-theme before
  // hydration. Trust it as the source of truth so hydration matches.
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme context provider (design D3 + D4).
 *
 * - Reads the initial theme from `<html data-theme>` (set by the inline
 *   boot script before hydration) so there is no FOUC.
 * - Persists changes to `localStorage.theme`.
 * - When a user is signed in, the `auth-onboarding` capability can sync
 *   the value to their profile (TODO).
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());

  // Re-sync if another tab changes the value.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue === "dark" ? "dark" : "light";
      setThemeState(next);
      document.documentElement.setAttribute("data-theme", next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / quota — non-fatal; the in-memory state still works.
    }
    // TODO(auth-onboarding): when authenticated, also persist to user profile.
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
