"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

/**
 * Theme toggle used on the Meg page (per design D8 — surfaced where users
 * configure things, not as an aggressive nag).
 *
 * Renders a single button that flips between light and dark and exposes
 * the current state via aria-pressed for assistive tech.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
      className="inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-fg hover:bg-surface-raised"
    >
      <span aria-hidden className="text-lg">
        {isDark ? "☀" : "☾"}
      </span>
      <span>{isDark ? "Lyst tema" : "Mørkt tema"}</span>
    </button>
  );
}
