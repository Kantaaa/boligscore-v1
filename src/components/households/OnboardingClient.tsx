"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createHousehold } from "@/server/households/createHousehold";
import { createInvitation } from "@/server/households/createInvitation";
import { ACTIVE_HOUSEHOLD_STORAGE_KEY } from "./ActiveHouseholdProvider";

type Step =
  | { kind: "form" }
  | { kind: "invite"; householdId: string; householdName: string; link: string | null };

/**
 * Client-side onboarding flow.
 *
 * Step 1: name input → createHousehold → on success, set
 *         localStorage.activeHouseholdId and move to step 2.
 * Step 2: post-create. Three CTAs: "Kopier invitasjonslenke" (calls
 *         createInvitation, then copies the resulting link), "Send via
 *         e-post" — DEFERRED, NOT RENDERED in MVP, "Hopp over" → /app.
 *
 * Per D9 the email-send button is intentionally absent.
 */
export function OnboardingClient({
  origin,
  hasOtherHouseholds: _hasOtherHouseholds,
}: {
  origin: string;
  hasOtherHouseholds: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createHousehold(name);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // Set the new household as active so the rest of the app picks
      // it up after we redirect.
      try {
        window.localStorage.setItem(
          ACTIVE_HOUSEHOLD_STORAGE_KEY,
          r.data.id,
        );
      } catch {
        /* swallow */
      }
      setStep({
        kind: "invite",
        householdId: r.data.id,
        householdName: name.trim(),
        link: null,
      });
    });
  }

  async function generateAndCopy() {
    if (step.kind !== "invite") return;
    setError(null);
    startTransition(async () => {
      const r = await createInvitation({ householdId: step.householdId });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const link = `${origin}/invitasjon/${r.data.token}`;
      setStep({ ...step, link });
      try {
        await navigator.clipboard.writeText(link);
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 2000);
      } catch {
        /* show the link on screen so the user can copy manually */
      }
    });
  }

  function skip() {
    router.replace("/app");
  }

  if (step.kind === "form") {
    return (
      <form className="space-y-3" onSubmit={submit}>
        <label className="block text-sm text-fg-muted" htmlFor="onb-name">
          Navn på husholdningen
        </label>
        <input
          id="onb-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="f.eks. Ine & Kanta"
          className="w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
        />
        {error ? <p className="text-sm text-status-bud-inne">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || name.trim().length === 0}
          className="min-h-touch w-full rounded-md bg-primary px-4 text-primary-fg disabled:opacity-60"
        >
          Opprett husholdning
        </button>
      </form>
    );
  }

  // step.kind === "invite"
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface-raised p-3">
        <p className="text-sm text-fg-muted">Husholdningen er klar:</p>
        <p className="text-lg font-semibold">{step.householdName}</p>
      </div>

      <p className="text-fg">Vil du invitere noen med en gang?</p>

      <button
        type="button"
        onClick={generateAndCopy}
        disabled={pending}
        className="min-h-touch w-full rounded-md bg-primary px-4 text-primary-fg disabled:opacity-60"
      >
        {step.link
          ? copyState === "copied"
            ? "Lenke kopiert ✓"
            : "Kopier invitasjonslenke"
          : "Lag invitasjonslenke"}
      </button>

      {step.link ? (
        <code className="block break-all rounded-md bg-bg p-2 text-xs">
          {step.link}
        </code>
      ) : null}

      {error ? <p className="text-sm text-status-bud-inne">{error}</p> : null}

      <button
        type="button"
        onClick={skip}
        disabled={pending}
        className="min-h-touch w-full rounded-md border border-border bg-surface-raised px-4 text-fg"
      >
        Hopp over
      </button>
    </div>
  );
}
