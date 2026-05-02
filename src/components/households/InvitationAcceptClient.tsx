"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acceptInvitation } from "@/server/households/acceptInvitation";

import { ACTIVE_HOUSEHOLD_STORAGE_KEY } from "./ActiveHouseholdProvider";

/**
 * Client-side acceptance handler.
 *
 * Two render paths:
 *   - alreadyMember: show the spec-locked Norwegian message and a
 *     "Bytt til denne husholdningen" button that sets the active id
 *     in localStorage and navigates to /app.
 *   - new acceptance: "Bli med" button → acceptInvitation. On success,
 *     persist the new household as active and route to /app.
 */
export function InvitationAcceptClient({
  token,
  householdId,
  alreadyMember,
}: {
  token: string;
  householdId: string;
  alreadyMember: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setActiveAndGo(id: string) {
    try {
      window.localStorage.setItem(ACTIVE_HOUSEHOLD_STORAGE_KEY, id);
    } catch {
      /* swallow */
    }
    router.replace("/app");
  }

  function accept() {
    setError(null);
    startTransition(async () => {
      const r = await acceptInvitation(token);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setActiveAndGo(r.data.household_id);
    });
  }

  if (alreadyMember) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-surface p-4 text-sm shadow-sm">
          Du er allerede medlem av denne husholdningen
        </div>
        <button
          type="button"
          onClick={() => setActiveAndGo(householdId)}
          className="min-h-touch w-full rounded-full bg-primary px-6 font-semibold text-primary-fg shadow-md transition hover:bg-primary-dim hover:shadow-lg"
        >
          Bytt til denne husholdningen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="min-h-touch w-full rounded-full bg-primary px-6 font-semibold text-primary-fg shadow-md transition hover:bg-primary-dim hover:shadow-lg disabled:opacity-60"
      >
        Bli med
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
