import type { ReactNode } from "react";

/**
 * Public layout used by `/`, `/registrer`, `/logg-inn`, and
 * `/invitasjon/[token]`. Deliberately minimal — no household switcher,
 * no bottom nav. Spec: "Shell does not render on public routes".
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-bg text-fg">{children}</div>;
}
