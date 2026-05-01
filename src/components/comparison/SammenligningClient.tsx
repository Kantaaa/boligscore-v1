"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { countMissingFelles } from "@/lib/comparison/math";
import type {
  ComparisonRow,
  PropertyComparison,
} from "@/lib/comparison/types";
import {
  FELLES_SAVE_FAILED_MESSAGE,
} from "@/lib/comparison/types";
import { useFocusRefresh } from "@/lib/comparison/useFocusRefresh";
import {
  clearFellesScore,
  getComparison,
  setFellesScore,
} from "@/server/comparison";

import { ComparisonMatrix } from "./ComparisonMatrix";
import { TotalscorePanel } from "./TotalscorePanel";

interface SammenligningClientProps {
  initialData: PropertyComparison;
  /** Display name for the viewer. Falls back to "Du" when no email. */
  yourName: string;
  /** Display name for the partner (null in single / 3+ households). */
  partnerName: string | null;
  /** True for viewers — Felles cells render disabled. */
  readOnly: boolean;
}

/**
 * Owns the optimistic UI for the Sammenligning tab.
 *
 *  - Refetch-on-focus via `useFocusRefresh` (D6).
 *  - After every successful setFellesScore / clearFellesScore, refetch
 *    so the matrix re-renders with the canonical row including any
 *    partner edits that landed in the same window.
 *  - Optimistic updates: on chip select, immediately patch the row's
 *    felles_score + recompute the totalscore client-side; if the
 *    server rejects, revert.
 *  - Errors surface inline — the matrix keeps rendering; only the
 *    affected row's felles cell is reverted.
 */
export function SammenligningClient({
  initialData,
  yourName,
  partnerName,
  readOnly,
}: SammenligningClientProps) {
  const [data, setData] = useState<PropertyComparison>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  void isPending;

  // Sync from server props when they change (e.g. router.refresh).
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const propertyId = data.property_id;

  const refetch = useCallback(() => {
    startTransition(async () => {
      const r = await getComparison(propertyId);
      if (r.ok) {
        setData(r.data);
        setError(null);
      }
      // We deliberately swallow refetch errors — focus refresh failures
      // shouldn't replace the working UI with an error state.
    });
  }, [propertyId]);

  useFocusRefresh(refetch);

  function patchRow(criterionId: string, mutator: (r: ComparisonRow) => ComparisonRow) {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.criterion_id === criterionId ? mutator(r) : r,
      ),
    }));
  }

  function handleSetFelles(criterionId: string, score: number) {
    if (readOnly) return;
    const before = data.rows.find((r) => r.criterion_id === criterionId);
    if (!before) return;

    // Optimistic update: row gains a felles score immediately.
    patchRow(criterionId, (r) => ({
      ...r,
      felles_score: score,
      felles_set: true,
    }));

    startTransition(async () => {
      const r = await setFellesScore(propertyId, criterionId, score);
      if (!r.ok) {
        // Revert.
        patchRow(criterionId, () => before);
        setError(r.error || FELLES_SAVE_FAILED_MESSAGE);
        return;
      }
      // Server is the source of truth for the totalscore; refetch to
      // pick up partner-side edits + canonical numbers.
      setError(null);
      setData((prev) => ({ ...prev, felles_total: r.data.felles_total }));
      refetch();
    });
  }

  function handleClearFelles(criterionId: string) {
    if (readOnly) return;
    const before = data.rows.find((r) => r.criterion_id === criterionId);
    if (!before) return;

    patchRow(criterionId, (r) => ({
      ...r,
      felles_score: null,
      felles_set: false,
    }));

    startTransition(async () => {
      const r = await clearFellesScore(propertyId, criterionId);
      if (!r.ok) {
        patchRow(criterionId, () => before);
        setError(r.error || FELLES_SAVE_FAILED_MESSAGE);
        return;
      }
      setError(null);
      setData((prev) => ({ ...prev, felles_total: r.data.felles_total }));
      refetch();
    });
  }

  const missingFelles = countMissingFelles(data.rows);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Sammenligning</h2>
        {readOnly ? (
          <p className="text-xs text-fg-muted">
            Du har observatør-tilgang og kan ikke endre felles score.
          </p>
        ) : null}
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-status-bud-inne/40 bg-status-bud-inne/10 px-3 py-2 text-sm text-fg"
          data-testid="comparison-error"
        >
          {error}
        </p>
      ) : null}

      <TotalscorePanel
        fellesTotal={data.felles_total}
        yourTotal={data.your_total}
        partnerTotal={data.partner_total}
        partnerName={partnerName}
        missingFelles={missingFelles}
        memberCount={data.member_count}
      />

      <ComparisonMatrix
        rows={data.rows}
        yourName={yourName}
        partnerName={partnerName}
        threshold={data.threshold}
        memberCount={data.member_count}
        readOnly={readOnly}
        onSetFelles={handleSetFelles}
        onClearFelles={handleClearFelles}
      />
    </div>
  );
}
