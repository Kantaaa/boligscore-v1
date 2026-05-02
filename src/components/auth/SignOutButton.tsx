"use client";

import { useTransition } from "react";

import { signOut } from "@/server/auth/signOut";

/**
 * "Logg ut" button. Spec: "Logout" — D7 mandates this is the only
 * place a sign-out action lives in the UI.
 *
 * Calls the `signOut` server action which clears the Supabase session
 * cookie and redirects to `/`. We use `useTransition` so the button is
 * disabled while the request is in flight.
 */
export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="min-h-touch w-full rounded-full bg-surface-muted px-6 font-medium text-fg shadow-sm transition hover:bg-surface-strong disabled:opacity-60"
    >
      {pending ? "Logger ut…" : "Logg ut"}
    </button>
  );
}
