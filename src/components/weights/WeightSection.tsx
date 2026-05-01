"use client";

import type {
  Criterion,
  CriterionSection,
} from "@/lib/weights/types";

import { WeightSlider } from "./WeightSlider";

interface WeightSectionProps {
  section: CriterionSection;
  criteria: Criterion[];
  /** Current weight per criterion id. */
  weights: Map<string, number>;
  /** Optional reference labels per criterion id (e.g. felles weight in personal view). */
  references?: Map<string, number>;
  /** Sticky-style "saved!" indicator per criterion id. Shown for ~1.2s after a commit. */
  savedFlash: Set<string>;
  /** True for viewers — sliders rendered disabled. */
  disabled?: boolean;
  /**
   * Called when the user releases a slider. The parent decides whether
   * to call `setHouseholdWeight` or `setUserWeight`.
   */
  onCommit: (criterionId: string, newValue: number) => void;
}

/**
 * Renders a labelled section heading + the criterion rows belonging
 * to it. Each row: criterion label (left), description (small, below
 * label), optional small reference label ("Felles: N"), slider on
 * the right.
 *
 * Mobile-first layout — flex-col on small screens; the description
 * sits under the label and the slider stretches across.
 */
export function WeightSection({
  section,
  criteria,
  weights,
  references,
  savedFlash,
  disabled = false,
  onCommit,
}: WeightSectionProps) {
  if (criteria.length === 0) return null;

  return (
    <section
      aria-labelledby={`section-${section.key}`}
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <header className="space-y-1">
        <h2
          id={`section-${section.key}`}
          className="text-lg font-semibold text-fg"
        >
          {section.label}
        </h2>
        {section.description ? (
          <p className="text-sm text-fg-muted">{section.description}</p>
        ) : null}
      </header>

      <ul className="space-y-4">
        {criteria.map((c) => {
          const value = weights.get(c.id) ?? 5;
          const refValue = references?.get(c.id);
          const inputId = `weight-${c.id}`;
          const isSaved = savedFlash.has(c.id);

          return (
            <li key={c.id} className="space-y-1.5">
              <label
                htmlFor={inputId}
                className="block text-sm font-medium text-fg"
              >
                {c.label}
              </label>
              {c.description ? (
                <p className="text-xs text-fg-muted">{c.description}</p>
              ) : null}
              {typeof refValue === "number" ? (
                <p
                  className="text-xs text-fg-muted"
                  aria-label={`Felles vekt for ${c.label}: ${refValue}`}
                >
                  <span aria-hidden>Felles: </span>
                  <span className="font-medium tabular-nums">{refValue}</span>
                </p>
              ) : null}
              <WeightSlider
                value={value}
                disabled={disabled}
                inputId={inputId}
                ariaLabel={c.label}
                savedFlash={isSaved}
                onCommit={(next) => onCommit(c.id, next)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
