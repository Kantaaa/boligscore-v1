"use client";

import type { PropertyStatus } from "@/lib/properties/types";

/**
 * Pill displaying a property's status: icon + label + color (a11y rule
 * — never just color). Two visual variants:
 *   - `inline` (default): static, used on cards.
 *   - `interactive`: rendered as a button that opens a status picker.
 *
 * Color is taken from the lookup row's `color` token (one of the
 * `status-*` tokens defined in `globals.css`). The component reads the
 * token name and applies it via the shared map below — Tailwind needs
 * literal class strings at build time.
 */

// Paired bg + fg per status — both tokens defined in globals.css and
// matched for WCAG AA contrast in both themes.
const STATUS_CLASS: Record<string, string> = {
  "status-favoritt": "bg-status-favoritt text-status-favoritt-fg",
  "status-vurderer": "bg-status-vurderer text-status-vurderer-fg",
  "status-paa-visning": "bg-status-paa-visning text-status-paa-visning-fg",
  "status-i-budrunde": "bg-status-i-budrunde text-status-i-budrunde-fg",
  "status-bud-inne": "bg-status-bud-inne text-status-bud-inne-fg",
  "status-kjopt": "bg-status-kjopt text-status-kjopt-fg",
  "status-ikke-aktuell": "bg-status-ikke-aktuell text-status-ikke-aktuell-fg",
};

function statusClass(token: string): string {
  return STATUS_CLASS[token] ?? "bg-surface-strong text-fg";
}

interface StatusBadgeProps {
  status: Pick<PropertyStatus, "label" | "color" | "icon">;
  variant?: "inline" | "interactive";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  variant = "inline",
  onClick,
  disabled,
  className,
}: StatusBadgeProps) {
  const cls = [
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
    statusClass(status.color),
    variant === "interactive" && !disabled
      ? "min-h-touch hover:brightness-105 cursor-pointer"
      : "",
    disabled ? "opacity-60 cursor-not-allowed" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (variant === "interactive") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={`Status: ${status.label} (trykk for å endre)`}
        className={cls}
      >
        <span aria-hidden="true">{status.icon}</span>
        <span>{status.label}</span>
      </button>
    );
  }

  return (
    <span className={cls} aria-label={`Status: ${status.label}`}>
      <span aria-hidden="true">{status.icon}</span>
      <span>{status.label}</span>
    </span>
  );
}
