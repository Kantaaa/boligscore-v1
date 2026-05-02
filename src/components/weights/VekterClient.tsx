"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Modal } from "@/components/households/Modal";
import { useActiveHousehold } from "@/components/households/ActiveHouseholdProvider";
import { canWrite } from "@/lib/households/roles";
import type {
  CriteriaCatalog,
  HouseholdWeight,
  UserWeight,
} from "@/lib/weights/types";
import {
  resetHouseholdWeights,
  resetUserWeights,
  setHouseholdWeight,
  setUserWeight,
} from "@/server/weights";

import { WeightSection } from "./WeightSection";

type View = "felles" | "personal";

interface VekterClientProps {
  catalog: CriteriaCatalog;
  initialFelles: HouseholdWeight[];
  initialPersonal: UserWeight[];
  /** Active household id at SSR time, used as fallback. */
  initialHouseholdId: string | null;
}

const SAVED_FLASH_MS = 1200;

/**
 * Top-level client component for `/app/vekter`.
 *
 * Owns:
 *  - segmented-control state, persisted in URL `?view=felles|personal`
 *  - in-memory copy of both weight sets, with optimistic updates on commit
 *  - reset confirmation modal
 *
 * Server actions are invoked on slider release (D10). On success we
 * flash a "lagret" indicator next to the relevant slider for ~1.2s.
 */
export function VekterClient({
  catalog,
  initialFelles,
  initialPersonal,
  initialHouseholdId,
}: VekterClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeHouseholdId, memberships } = useActiveHousehold();
  const householdId = activeHouseholdId ?? initialHouseholdId;
  const myRole =
    memberships.find((m) => m.id === householdId)?.role ?? null;
  const editable = myRole !== null && canWrite(myRole);

  const view: View =
    searchParams.get("view") === "personal" ? "personal" : "felles";

  // Local maps for optimistic display + commit.
  const [fellesMap, setFellesMap] = useState<Map<string, number>>(() =>
    toMap(initialFelles),
  );
  const [personalMap, setPersonalMap] = useState<Map<string, number>>(() =>
    toMap(initialPersonal),
  );
  const [savedFlash, setSavedFlash] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  void isPending;
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Cleanup any flash timers on unmount.
  useEffect(() => {
    const timers = flashTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  function flashSaved(criterionId: string) {
    setSavedFlash((prev) => {
      const next = new Set(prev);
      next.add(criterionId);
      return next;
    });
    const existing = flashTimers.current.get(criterionId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setSavedFlash((prev) => {
        const next = new Set(prev);
        next.delete(criterionId);
        return next;
      });
      flashTimers.current.delete(criterionId);
    }, SAVED_FLASH_MS);
    flashTimers.current.set(criterionId, t);
  }

  function setView(next: View) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "felles") {
      params.delete("view");
    } else {
      params.set("view", next);
    }
    const qs = params.toString();
    router.replace(qs ? `/app/vekter?${qs}` : "/app/vekter", {
      scroll: false,
    });
  }

  async function handleCommitFelles(criterionId: string, value: number) {
    if (!householdId || !editable) return;
    const prev = fellesMap.get(criterionId);
    setFellesMap((m) => {
      const next = new Map(m);
      next.set(criterionId, value);
      return next;
    });
    startTransition(async () => {
      const r = await setHouseholdWeight(householdId, criterionId, value);
      if (!r.ok) {
        setError(r.error);
        // Revert.
        setFellesMap((m) => {
          const next = new Map(m);
          if (prev !== undefined) next.set(criterionId, prev);
          return next;
        });
        return;
      }
      setError(null);
      flashSaved(criterionId);
    });
  }

  async function handleCommitPersonal(criterionId: string, value: number) {
    if (!householdId || !editable) return;
    const prev = personalMap.get(criterionId);
    setPersonalMap((m) => {
      const next = new Map(m);
      next.set(criterionId, value);
      return next;
    });
    startTransition(async () => {
      const r = await setUserWeight(householdId, criterionId, value);
      if (!r.ok) {
        setError(r.error);
        setPersonalMap((m) => {
          const next = new Map(m);
          if (prev !== undefined) next.set(criterionId, prev);
          return next;
        });
        return;
      }
      setError(null);
      flashSaved(criterionId);
    });
  }

  async function handleConfirmReset() {
    if (!householdId || !editable) {
      setResetOpen(false);
      return;
    }
    const r =
      view === "felles"
        ? await resetHouseholdWeights(householdId)
        : await resetUserWeights(householdId);
    if (!r.ok) {
      setError(r.error);
      setResetOpen(false);
      return;
    }
    // Update local state to all-fives.
    if (view === "felles") {
      setFellesMap(allFives(catalog));
    } else {
      setPersonalMap(allFives(catalog));
    }
    setError(null);
    setResetOpen(false);
  }

  // Group criteria by section (already sorted in catalog).
  const groupedCriteria = useMemo(() => {
    const m = new Map<string, typeof catalog.criteria>();
    for (const c of catalog.criteria) {
      const arr = m.get(c.section_id) ?? [];
      arr.push(c);
      m.set(c.section_id, arr);
    }
    return m;
  }, [catalog]);

  const activeMap = view === "felles" ? fellesMap : personalMap;
  const referenceMap = view === "personal" ? fellesMap : undefined;

  return (
    <section aria-labelledby="vekter-heading" className="space-y-6">
      <header className="space-y-2">
        <h1
          id="vekter-heading"
          className="font-headline text-2xl font-extrabold tracking-tight text-fg"
        >
          Vekter
        </h1>
        <p className="text-sm text-fg-muted">
          Justér hvor mye hvert kriterium teller. Lavere = mindre viktig.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Vis vekter"
        className="inline-flex w-full rounded-full bg-surface-muted p-1 sm:w-auto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "felles"}
          onClick={() => setView("felles")}
          className={[
            "min-h-touch flex-1 rounded-full px-4 py-2 text-sm font-medium transition sm:flex-initial",
            view === "felles"
              ? "bg-primary text-primary-fg shadow-sm"
              : "text-fg-muted hover:text-fg",
          ].join(" ")}
        >
          Felles vekter
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "personal"}
          onClick={() => setView("personal")}
          className={[
            "min-h-touch flex-1 rounded-full px-4 py-2 text-sm font-medium transition sm:flex-initial",
            view === "personal"
              ? "bg-primary text-primary-fg shadow-sm"
              : "text-fg-muted hover:text-fg",
          ].join(" ")}
        >
          Mine personlige vekter
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-status-bud-inne px-3 py-2 text-sm text-status-bud-inne-fg"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {catalog.sections.map((section) => (
          <WeightSection
            key={section.id}
            section={section}
            criteria={groupedCriteria.get(section.id) ?? []}
            weights={activeMap}
            references={referenceMap}
            savedFlash={savedFlash}
            disabled={!editable}
            onCommit={
              view === "felles" ? handleCommitFelles : handleCommitPersonal
            }
          />
        ))}
      </div>

      {editable ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="min-h-touch rounded-full bg-surface-muted px-5 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-strong hover:text-fg"
          >
            Tilbakestill alle til 5
          </button>
        </div>
      ) : null}

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        labelledBy="reset-modal-title"
      >
        <h2
          id="reset-modal-title"
          className="font-headline text-xl font-bold text-fg"
        >
          {view === "felles"
            ? "Tilbakestill felles vekter?"
            : "Tilbakestill mine vekter?"}
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          {view === "felles"
            ? "Dette tilbakestiller VEKTENE FOR HELE HUSHOLDNINGEN til 5 over hele linjen. Alle medlemmer ser endringen."
            : "Dette tilbakestiller dine personlige vekter til 5 over hele linjen. Andre medlemmer ser ikke dette."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setResetOpen(false)}
            className="min-h-touch rounded-full bg-surface-muted px-5 py-2 text-sm font-medium text-fg-muted hover:bg-surface-strong hover:text-fg"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleConfirmReset}
            className="min-h-touch rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-fg shadow-sm hover:bg-primary-dim"
          >
            Tilbakestill
          </button>
        </div>
      </Modal>
    </section>
  );
}

function toMap(rows: Array<{ criterion_id: string; weight: number }>) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.criterion_id, r.weight);
  return m;
}

function allFives(catalog: CriteriaCatalog): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of catalog.criteria) m.set(c.id, 5);
  return m;
}
