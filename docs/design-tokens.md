# Design tokens

> Status: **Stitch-extracted (Boligscore v2)** — Material 3 palette,
> green primary, warm-grey surfaces. Re-run the extraction when the
> Stitch designs are updated (steps at the bottom).

## Where the tokens live

| Layer | File | Notes |
| --- | --- | --- |
| CSS variables | `src/app/globals.css` | Defined under `:root[data-theme="light"]` and `:root[data-theme="dark"]`. |
| Tailwind utilities | `tailwind.config.ts` | Maps `bg-surface`, `text-fg`, `bg-primary-container`, ... to the variables above. |
| Theme bootstrap | `src/app/layout.tsx` | Inline `<head>` script applies `data-theme` before paint (D4). Loads Manrope (headlines) + Inter (body) via `next/font/google`. |

## Naming convention

Tokens are **semantic**, never literal. JSX uses `bg-surface`, never
`bg-white`. Stitch's M3 token names map to ours as follows:

| Stitch (M3) | Our token | Why renamed |
| --- | --- | --- |
| `surface` | `--color-bg` | Top-level page background |
| `surface-container-lowest` | `--color-surface` | Card surface |
| `surface-container-low` | `--color-surface-raised` | Sticky chrome, headers |
| `surface-container` | `--color-surface-muted` | Section dividers, info chips |
| `surface-container-high` | `--color-surface-strong` | Chip-rad inactive, search bg |
| `surface-container-highest` | `--color-surface-stronger` | Strongest neutral fill |
| `on-surface` | `--color-fg` | Body text |
| `on-surface-variant` | `--color-fg-muted` | Captions, descriptions |
| `outline` | `--color-fg-soft` | Tertiary text |
| `outline-variant` | `--color-border` | Hairlines, input outlines |
| `primary` | `--color-primary` | Primary CTAs, active nav, focus ring |
| `primary-container` | `--color-primary-container` | Subtle primary-tinted fills |
| `tertiary` | `--color-accent` | Yellow-green accent |
| `error` | `--color-danger` | Destructive actions |
| `error-container` | `--color-danger-container` | Soft destructive states |

## Color tokens

### Brand & surface (light)

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#fefcf2` | Page background — warm off-white |
| `--color-surface` | `#ffffff` | Card surface |
| `--color-surface-raised` | `#fbfaed` | Top app bar, popovers |
| `--color-surface-muted` | `#f5f4e6` | Section background |
| `--color-surface-strong` | `#efefe0` | Chip-rad inactive bg |
| `--color-surface-stronger` | `#e9e9d8` | Strongest neutral fill |
| `--color-fg` | `#37392d` | Primary text |
| `--color-fg-muted` | `#646658` | Secondary text |
| `--color-fg-soft` | `#808273` | Tertiary text |
| `--color-border` | `#b9baab` | Input outline |
| `--color-border-soft` | `#e9e9d8` | Subtle divider |
| `--color-primary` | `#4f6c45` | Primary green — CTAs, active state |
| `--color-primary-dim` | `#43603a` | Hover / pressed primary |
| `--color-primary-fg` | `#ffffff` | Text on primary fills |
| `--color-primary-container` | `#caecbc` | Subtle primary-tinted fill |
| `--color-primary-container-fg` | `#3d5934` | Text on primary-container |
| `--color-secondary` | `#5a6953` | Secondary nav, subtler accents |
| `--color-secondary-container` | `#d7e8cd` | Soft secondary fill |
| `--color-accent` | `#686730` | Yellow-green accent — sparingly used |
| `--color-accent-container` | `#f7f4af` | Pale yellow accent background |
| `--color-danger` | `#ae4025` | Destructive CTAs |
| `--color-danger-container` | `#fd795a` | Soft destructive fills |

### Brand & surface (dark)

Same names, dark-mode values. Notable: primary becomes `#a3b69a` (lighter
green for contrast on dark backgrounds), backgrounds become deep warm-grey
`#1c1c16`. See `globals.css` for the full set.

### Status palette (pastel pills with paired bg + fg)

Status badges always render **icon + text + color** together
(spec: "Accessibility floor"). Each status has both a `bg-status-*`
fill AND a `text-status-*-fg` for the text/icon — pre-paired for
WCAG AA contrast.

| Token | Light bg / fg | Dark bg / fg | Status (NO) |
| --- | --- | --- | --- |
| `--color-status-favoritt` | `#f7f4af` / `#5d5c27` | `#4b4a16` / `#f7f4af` | Favoritt — pale gul |
| `--color-status-vurderer` | `#efefe0` / `#37392d` | `#4b4b3f` / `#e5e2d9` | Vurderer — nøytral grå |
| `--color-status-paa-visning` | `#d7e8cd` / `#475641` | `#354330` / `#d7e8cd` | På visning — myk grønn |
| `--color-status-i-budrunde` | `#ffd6b3` / `#5d3a14` | `#5d3a14` / `#ffd6b3` | I budrunde — varm oransje |
| `--color-status-bud-inne` | `#fd795a` / `#6e1400` | `#791903` / `#ffd6cd` | Bud inne — sterk rød |
| `--color-status-kjopt` | `#caecbc` / `#2b4623` | `#2b4623` / `#caecbc` | Kjøpt — primary-tinted grønn |
| `--color-status-ikke-aktuell` | `#b9baab` / `#37392d` | `#4b4b3f` / `#b9baab` | Ikke aktuell — dempet grå |

## Typography

Stitch uses **Manrope** for headlines and **Inter** for body. Both are
loaded via `next/font/google` (subsetted, Latin) in `layout.tsx`.

| Class | Font | Use |
| --- | --- | --- |
| `font-headline` | Manrope (500 / 700 / 800) | h1-h3, hero, panel headers |
| `font-body` | Inter (400 / 500 / 600) | Body text, descriptions |
| `font-sans` | Inter (alias) | Backwards compatibility |

## Layout tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bottom-nav-h` | `64px` | Height of the fixed bottom nav. `<main>` uses `pb-bottom-nav` so content scrolls past it. |
| `--radius-sm` | `0.25rem` (4px) | Tiny radii (chips inside dense UI) |
| `--radius-md` | `0.5rem` (8px) | Buttons, inputs |
| `--radius-lg` | `0.75rem` (12px) | Cards, sheets |
| `--radius-xl` | `1rem` (16px) | FAB, hero cards |
| `--radius-2xl` | `1.5rem` (24px) | Bottom-nav rounded top, modals |
| `--radius-full` | `9999px` | Pills, status badges |

## Shadows

Stitch uses primary-tinted soft drop shadows (alpha varies). All
exposed via Tailwind's `shadow-*` utilities.

| Class | Value | Use |
| --- | --- | --- |
| `shadow-sm` | `0 4px 12px rgba(79, 108, 69, 0.04)` | Light cards |
| `shadow` / `shadow-md` | `0 8px 24px rgba(79, 108, 69, 0.08)` | Default card shadow |
| `shadow-lg` | `0 12px 32px rgba(79, 108, 69, 0.16)` | Hover, elevated CTAs |
| `shadow-elevated` | `0 20px 40px rgba(79, 108, 69, 0.1)` | Hero panels |
| `shadow-bottom-nav` | `0 -8px 24px rgba(79, 108, 69, 0.08)` | Bottom nav (negative y) |

## Re-running the Stitch extraction

When the Stitch designs change:

1. List screens: `mcp__stitch__list_screens` for the `Boligscore v2` project (id `12862659175390467621`).
2. For each screen: `mcp__stitch__get_screen` → download the HTML via the returned `downloadUrl`.
3. Each screen's inline `<script id="tailwind-config">` block holds the canonical M3 palette. Diff against the values in this doc.
4. Update **all three** files in the same commit so they cannot drift:
   - `src/app/globals.css`
   - `tailwind.config.ts`
   - `docs/design-tokens.md` (this file)
5. Run the contrast check (axe in Playwright, `tests/e2e/a11y.spec.ts`) to confirm WCAG AA still holds.
6. Eyeball the dev server in both light and dark themes for the most-touched pages (`/app`, `/app/bolig/[id]/min-vurdering`, `/app/vekter`).
