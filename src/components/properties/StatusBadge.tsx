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

const STATUS_BG: Record<string, string> = {
  "status-favoritt": "bg-status-favoritt/20 border-status-favoritt/60",
  "status-vurderer": "bg-status-vurderer/20 border-status-vurderer/60",
  "status-paa-visning":
    "bg-status-paa-visning/20 border-status-paa-visning/60",
  "status-i-budrunde":
    "bg-status-i-budrunde/20 border-status-i-budrunde/60",
  "status-bud-inne": "bg-status-bud-inne/20 border-status-bud-inne/60",
  "status-kjopt": "bg-status-kjopt/20 border-status-kjopt/60",
  "status-ikke-aktuell":
    "bg-status-ikke-aktuell/20 border-status-ikke-aktuell/60",
};

function statusClass(token: string): string {
  return STATUS_BG[token] ?? "bg-surface-raised border-border";
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
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
    statusClass(status.color),
    variant === "interactive" && !disabled
      ? "min-h-touch min-w-touch hover:brightness-110 cursor-pointer"
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
        <span className="text-fg">{status.label}</span>
      </button>
    );
  }

  return (
    <span className={cls} aria-label={`Status: ${status.label}`}>
      <span aria-hidden="true">{status.icon}</span>
      <span className="text-fg">{status.label}</span>
    </span>
  );
}
