# Design tokens

> Status: **PLACEHOLDER** — pending a Stitch-extraction pass.
>
> Values below were chosen to satisfy the brief (`rolig blå` primary,
> `varm grå` neutrals, pastell statusfarger) and to give every other
> capability stable token names to consume. They are **not** a faithful
> translation of the Stitch v2 designs yet. Once the Stitch screens are
> pulled (`mcp__stitch__get_screen` for each screen in the
> `Boligscore v2` project) the values in `src/app/globals.css` and the
> table below should be updated together.

## Where the tokens live

| Layer | File | Notes |
| --- | --- | --- |
| CSS variables | `src/app/globals.css` | Defined under `:root[data-theme="light"]` and `:root[data-theme="dark"]`. |
| Tailwind utilities | `tailwind.config.ts` | Maps `bg-surface`, `text-fg`, ... to the variables above. |
| Theme bootstrap | `src/app/layout.tsx` | Inline `<head>` script applies `data-theme` before paint (D4). |

## Naming convention

Tokens are **semantic**, never literal. JSX uses `bg-surface`, never
`bg-white`. This keeps components theme-agnostic and lets a future
third theme drop in without touching call sites.

## Color tokens

### Brand & surface

| Token | Light | Dark | Source | Use |
| --- | --- | --- | --- | --- |
| `--color-bg` | `#f8f6f1` (varm grå -1) | `#15181a` | placeholder | Page background |
| `--color-surface` | `#ffffff` | `#1c1f1d` | placeholder | Cards, default panels |
| `--color-surface-raised` | `#fdfcf8` | `#242826` | placeholder | Modals, popovers, sticky chrome |
| `--color-fg` | `#1c1f1d` | `#ece9e1` | placeholder | Body text, primary content |
| `--color-fg-muted` | `#5b605c` | `#a0a39e` | placeholder | Secondary text, captions |
| `--color-border` | `#e6e2d8` | `#2f3431` | placeholder | Hairlines, input outlines |
| `--color-primary` | `#3a6ea5` (rolig blå) | `#6fa3d4` | placeholder | Primary CTAs, active nav, focus ring |
| `--color-primary-fg` | `#ffffff` | `#0e1213` | placeholder | Foreground on primary fills |
| `--color-accent` | `#c8a96a` (varm beige-gull) | `#d6b97a` | placeholder | Subtle accents, highlights |

### Status palette (pastell, never color-only)

Status badges always render **icon + text + color** together
(spec: "Accessibility floor"). Colors are pastell so dark text remains
readable on both themes.

| Token | Light | Dark | Status label (NO) |
| --- | --- | --- | --- |
| `--color-status-favoritt` | `#f4d35e` | `#d4b03e` | Favoritt (gul) |
| `--color-status-vurderer` | `#8fb4d8` | `#6f95bc` | Vurderer (blå) |
| `--color-status-paa-visning` | `#b8a4d4` | `#9885b8` | På visning (lilla) |
| `--color-status-i-budrunde` | `#f0a868` | `#cc8b50` | I budrunde (oransje) |
| `--color-status-bud-inne` | `#d97c7c` | `#b86060` | Bud inne (rød) |
| `--color-status-kjopt` | `#88b894` | `#6a9676` | Kjøpt (grønn) |
| `--color-status-ikke-aktuell` | `#b8b3a8` | `#8d8a82` | Ikke aktuell (grå) |

> Why blue (not green) as primary: status `kjopt` is green. Picking a
> green primary collides with that signal in card thumbnails and would
> force the status palette to shift. Blue keeps the two roles distinct.

## Layout tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bottom-nav-h` | `64px` | Height of the fixed bottom nav. `<main>` uses `pb-bottom-nav` so content scrolls past it. |
| `--font-sans` | `Inter, system-ui, ...` | Default body font |
| `--radius-sm` | `6px` | Inputs, small chips |
| `--radius-md` | `12px` | Cards, sheets |
| `--radius-lg` | `20px` | FAB, hero cards |

## Type scale (placeholder)

Awaiting Stitch extraction. Until then, default Tailwind sizes
(`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`,
`text-3xl`) are in use. The Stitch pass should codify display /
heading / body / caption sizes with explicit line-heights.

## Spacing scale (placeholder)

Default Tailwind spacing scale until Stitch extraction overrides it.

## Re-running the Stitch extraction

When values change in Stitch:

1. Run `mcp__stitch__list_screens` for the `Boligscore v2` project.
2. For each screen, `mcp__stitch__get_screen` and copy the inline
   palette / typography out of the rendered HTML.
3. Update both this document and `src/app/globals.css` in the same
   commit so they cannot drift.
4. Re-run the contrast checker (axe in Playwright, task 9.8) to make
   sure WCAG AA still holds in both themes.
