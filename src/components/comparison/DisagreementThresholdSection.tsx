"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { formatThresholdHelper } from "@/lib/comparison/types";
import { setDisagreementThreshold } from "@/server/comparison";

interface DisagreementThresholdSectionProps {
  householdId: string;
  /** Initial value of households.comparison_disagreement_threshold (1..10). */
  initialThreshold: number;
  /** True when the viewer is the owner — only owner can edit. */
  canEdit: boolean;
}

const KEYBOARD_DEBOUNCE_MS = 250;

/**
 * "Uenighetsgrense" section for the Husstand page. Slider 1-10 with a
 * live-updating helper text. Owner can edit; non-owner sees the slider
 * disabled with a read-only summary instead.
 *
 * Spec coverage:
 *   - "Owner changes threshold" — slider commit calls
 *     `setDisagreementThreshold` server action.
 *   - "Member cannot change threshold" — RLS denies; UI also disables
 *     the slider for non-owner roles.
 *   - "Out of range rejected" — slider is bounded 1..10 + server-side
 *     validation via `validateThreshold`.
 *
 *  Save semantics mirror the weight slider (weights/WeightSlider): we
 *  commit on pointerup/touchend/change, debounced for keyboard arrow
 *  spam.
 */
export function DisagreementThresholdSection({
  householdId,
  initialThreshold,
  canEdit,
}: DisagreementThresholdSectionProps) {
  const [value, setValue] = useState<number>(initialThreshold);
  const [serverValue, setServerValue] = useState<number>(initialThreshold);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactingRef = useRef(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from props when the parent re-renders with a fresh value.
  useEffect(() => {
    if (interactingRef.current) return;
    setValue(initialThreshold);
    setServerValue(initialThreshold);
  }, [initialThreshold]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (flashRef.current) clearTimeout(flashRef.current);
    };
  }, []);

  function commit(next: number) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (next === serverValue) return;
    setError(null);
    startTransition(async () => {
      const r = await setDisagreementThreshold(householdId, next);
      if (!r.ok) {
        // Revert local state.
        setValue(serverValue);
        setError(r.error);
        return;
      }
      setServerValue(next);
      setSavedFlash(true);
      if (flashRef.current) clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => setSavedFlash(false), 1500);
    });
  }

  function scheduleCommit(next: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(next), KEYBOARD_DEBOUNCE_MS);
  }

  return (
    <section
      aria-labelledby="hh-threshold-heading"
      className="space-y-3"
      data-testid="threshold-section"
    >
      <div className="space-y-1">
        <h2 id="hh-threshold-heading" className="text-lg font-semibold">
          Uenighetsgrense
        </h2>
        <p className="text-sm text-fg-muted" data-testid="threshold-helper">
          {formatThresholdHelper(value)}
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface-raised p-3">
        <label
          htmlFor="threshold-slider"
          className="sr-only"
        >
          Uenighetsgrense (1-10)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="threshold-slider"
            type="range"
            min={1}
            max={10}
            step={1}
            disabled={!canEdit || pending}
            value={value}
            aria-label="Uenighetsgrense"
            aria-valuemin={1}
            aria-valuemax={10}
            aria-valuenow={value}
            onPointerDown={() => {
              interactingRef.current = true;
            }}
            onPointerUp={() => {
              interactingRef.current = false;
              commit(value);
            }}
            onPointerCancel={() => {
              interactingRef.current = false;
            }}
            onTouchEnd={() => {
              interactingRef.current = false;
              commit(value);
            }}
            onChange={(e) => {
              const next = Number(e.target.value);
              setValue(next);
              scheduleCommit(next);
            }}
            className={[
              "vekter-slider min-w-0 flex-1",
              !canEdit ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            ].join(" ")}
          />
          <span
            className={[
              "min-w-[2.5rem] text-right tabular-nums text-sm font-medium",
              savedFlash ? "vekter-saved text-primary" : "text-fg",
            ].join(" ")}
            aria-live="polite"
            data-testid="threshold-value"
          >
            {savedFlash ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>✓</span>
                <span className="sr-only">lagret</span>
                <span aria-hidden>{value}</span>
              </span>
            ) : (
              <span>{value}</span>
            )}
          </span>
        </div>
        {!canEdit ? (
          <p className="mt-2 text-xs text-fg-muted">
            Bare eieren kan endre uenighetsgrensen.
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm text-status-bud-inne" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
