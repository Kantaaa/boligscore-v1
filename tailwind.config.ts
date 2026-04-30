import type { Config } from "tailwindcss";

/**
 * Tailwind v3 (per design D10).
 *
 * Semantic tokens are CSS variables defined in `src/app/globals.css`
 * under `:root[data-theme="light"]` and `:root[data-theme="dark"]`.
 * Tailwind utility classes resolve to those variables so the JSX stays
 * theme-agnostic (e.g. `bg-surface`, not `bg-white dark:bg-slate-900`).
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        fg: "var(--color-fg)",
        "fg-muted": "var(--color-fg-muted)",
        primary: "var(--color-primary)",
        "primary-fg": "var(--color-primary-fg)",
        accent: "var(--color-accent)",
        border: "var(--color-border)",
        "status-favoritt": "var(--color-status-favoritt)",
        "status-vurderer": "var(--color-status-vurderer)",
        "status-paa-visning": "var(--color-status-paa-visning)",
        "status-i-budrunde": "var(--color-status-i-budrunde)",
        "status-bud-inne": "var(--color-status-bud-inne)",
        "status-kjopt": "var(--color-status-kjopt)",
        "status-ikke-aktuell": "var(--color-status-ikke-aktuell)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      spacing: {
        "bottom-nav": "var(--bottom-nav-h)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      maxWidth: {
        content: "960px",
      },
    },
  },
  plugins: [],
};

export default config;
