import { roleIcon, roleLabel } from "@/lib/households/roles";
import type { HouseholdRole } from "@/lib/households/types";

const COLOR_BY_ROLE: Record<HouseholdRole, string> = {
  // Color tokens come from globals.css; the badge always pairs the colour
  // with text + icon (a11y rule: never colour alone).
  owner:
    "bg-status-favoritt/20 text-fg border border-status-favoritt/60",
  member:
    "bg-status-vurderer/20 text-fg border border-status-vurderer/60",
  viewer:
    "bg-status-ikke-aktuell/30 text-fg border border-status-ikke-aktuell/60",
};

/**
 * Pill-shaped role indicator. Renders icon + Norwegian label + colour
 * so the role is communicated through three independent channels.
 */
export function RoleBadge({ role }: { role: HouseholdRole }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        COLOR_BY_ROLE[role],
      ].join(" ")}
      aria-label={`Rolle: ${roleLabel(role)}`}
    >
      <span aria-hidden>{roleIcon(role)}</span>
      <span>{roleLabel(role)}</span>
    </span>
  );
}
