import type { Config } from "tailwindcss";

/**
 * Tailwind v3.
 *
 * Semantic tokens live as CSS variables in `src/app/globals.css` under
 * `:root[data-theme="light"]` and `:root[data-theme="dark"]`. Tailwind
 * classes resolve to those variables so JSX stays theme-agnostic
 * (e.g. `bg-surface` not `bg-white dark:bg-slate-900`).
 *
 * Token vocabulary mirrors Stitch's Material 3 palette — see
 * `docs/design-tokens.md` for the full mapping.
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
        // Surfaces
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        "surface-muted": "var(--color-surface-muted)",
        "surface-strong": "var(--color-surface-strong)",
        "surface-stronger": "var(--color-surface-stronger)",
        // Foreground
        fg: "var(--color-fg)",
        "fg-muted": "var(--color-fg-muted)",
        "fg-soft": "var(--color-fg-soft)",
        // Borders
        border: "var(--color-border)",
        "border-soft": "var(--color-border-soft)",
        // Brand
        primary: "var(--color-primary)",
        "primary-dim": "var(--color-primary-dim)",
        "primary-fg": "var(--color-primary-fg)",
        "primary-container": "var(--color-primary-container)",
        "primary-container-fg": "var(--color-primary-container-fg)",
        // Secondary
        secondary: "var(--color-secondary)",
        "secondary-container": "var(--color-secondary-container)",
        "secondary-container-fg": "var(--color-secondary-container-fg)",
        // Tertiary / accent
        accent: "var(--color-accent)",
        "accent-container": "var(--color-accent-container)",
        "accent-container-fg": "var(--color-accent-container-fg)",
        // Error / danger
        danger: "var(--color-danger)",
        "danger-fg": "var(--color-danger-fg)",
        "danger-container": "var(--color-danger-container)",
        "danger-container-fg": "var(--color-danger-container-fg)",
        // Status pills (each pairs bg + fg)
        "status-favoritt": "var(--color-status-favoritt)",
        "status-favoritt-fg": "var(--color-status-favoritt-fg)",
        "status-vurderer": "var(--color-status-vurderer)",
        "status-vurderer-fg": "var(--color-status-vurderer-fg)",
        "status-paa-visning": "var(--color-status-paa-visning)",
        "status-paa-visning-fg": "var(--color-status-paa-visning-fg)",
        "status-i-budrunde": "var(--color-status-i-budrunde)",
        "status-i-budrunde-fg": "var(--color-status-i-budrunde-fg)",
        "status-bud-inne": "var(--color-status-bud-inne)",
        "status-bud-inne-fg": "var(--color-status-bud-inne-fg)",
        "status-kjopt": "var(--color-status-kjopt)",
        "status-kjopt-fg": "var(--color-status-kjopt-fg)",
        "status-ikke-aktuell": "var(--color-status-ikke-aktuell)",
        "status-ikke-aktuell-fg": "var(--color-status-ikke-aktuell-fg)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        headline: ["var(--font-headline)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        elevated: "var(--shadow-elevated)",
        "bottom-nav": "var(--shadow-bottom-nav)",
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
