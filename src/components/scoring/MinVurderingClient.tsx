"use client";

import { useMemo, useState, useTransition } from "react";

import type {
  CriteriaCatalog,
  Criterion,
  CriterionSection,
} from "@/lib/weights/types";
import type {
  PropertyScore,
  PropertySectionNote,
  PropertyWithScoresRow,
} from "@/lib/scoring/types";
import {
  SCORE_SAVE_FAILED_MESSAGE,
  formatScoreCounter,
} from "@/lib/scoring/types";
import { setNote, setScore } from "@/server/scoring";

import { ScoreChipRow } from "./ScoreChipRow";
import { SectionNotes } from "./SectionNotes";

interface MinVurderingClientProps {
  property: PropertyWithScoresRow;
  catalog: CriteriaCatalog;
  initialScores: PropertyScore[];
  initialNotes: PropertySectionNote[];
  /** True for viewers — chips disabled, notes read-only. */
  readOnly: boolean;
}

/**
 * Owns the optimistic UI for chip taps + delegates note autosave to
 * `<SectionNotes>`. Server data flows in via props from the page;
 * subsequent updates live in local state until a refetch (we call
 * `revalidatePath` server-side so the next navigation is fresh).
 *
 * Optimistic semantics (D3, D7):
 *   1. User taps a chip → setScoreMap immediately (chip fills).
 *   2. await setScore() server action.
 *   3. On success: update counter from server response; clear error.
 *   4. On error: revert scoreMap to pre-tap state; show toast.
 */
export function MinVurderingClient({
  property,
  catalog,
  initialScores,
  initialNotes,
  readOnly,
}: MinVurderingClientProps) {
  const [scoreMap, setScoreMap] = useState<Map<string, number>>(() =>
    toScoreMap(initialScores),
  );
  const [counter, setCounter] = useState<number>(property.your_score_count);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  void isPending;

  // Group criteria by section id (already sorted by sort_order).
  const groupedCriteria = useMemo(() => {
    const m = new Map<string, Criterion[]>();
    for (const c of catalog.criteria) {
      const arr = m.get(c.section_id) ?? [];
      arr.push(c);
      m.set(c.section_id, arr);
    }
    return m;
  }, [catalog]);

  // Index initial notes by section_id for the SectionNotes initial body.
  const initialNoteBody = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of initialNotes) m.set(n.section_id, n.body);
    return m;
  }, [initialNotes]);

  function handleSelect(criterionId: string, next: number) {
    if (readOnly) return;
    const prev = scoreMap.get(criterionId);
    // Optimistic update.
    setScoreMap((m) => {
      const nx = new Map(m);
      nx.set(criterionId, next);
      return nx;
    });
    if (prev === undefined) {
      // Counter optimistically increments by 1 for a brand-new score.
      setCounter((c) => Math.min(c + 1, property.total_criteria));
    }
    startTransition(async () => {
      const r = await setScore(property.id, criterionId, next);
      if (!r.ok) {
        // Roll back chip + counter.
        setScoreMap((m) => {
          const nx = new Map(m);
          if (prev === undefined) {
            nx.delete(criterionId);
          } else {
            nx.set(criterionId, prev);
          }
          return nx;
        });
        if (prev === undefined) {
          setCounter((c) => Math.max(c - 1, 0));
        }
        setError(r.error || SCORE_SAVE_FAILED_MESSAGE);
        return;
      }
      // Server is the source of truth for the counter — sync if the
      // optimistic guess was off (e.g. another tab edited).
      setCounter(r.data.your_score_count);
      setError(null);
    });
  }

  async function handleNoteSave(
    sectionId: string,
    body: string,
  ): Promise<string | null> {
    if (readOnly) return null;
    const r = await setNote(property.id, sectionId, body);
    return r.ok ? null : r.error || SCORE_SAVE_FAILED_MESSAGE;
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Min vurdering</h2>
        <p
          className="text-sm text-fg-muted"
          aria-live="polite"
          data-testid="score-counter"
        >
          {formatScoreCounter(counter, property.total_criteria)}
        </p>
        {readOnly ? (
          <p className="text-xs text-fg-muted">
            Du har observatør-tilgang og kan ikke endre vurderingen.
          </p>
        ) : null}
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-status-bud-inne/40 bg-status-bud-inne/10 px-3 py-2 text-sm text-fg"
          data-testid="score-error"
        >
          {error}
        </p>
      ) : null}

      {catalog.sections.map((section) => (
        <ScoreSection
          key={section.id}
          section={section}
          criteria={groupedCriteria.get(section.id) ?? []}
          scoreMap={scoreMap}
          readOnly={readOnly}
          initialNoteBody={initialNoteBody.get(section.id) ?? ""}
          onSelect={handleSelect}
          onSaveNote={(body) => handleNoteSave(section.id, body)}
        />
      ))}
    </div>
  );
}

interface ScoreSectionProps {
  section: CriterionSection;
  criteria: Criterion[];
  scoreMap: Map<string, number>;
  readOnly: boolean;
  initialNoteBody: string;
  onSelect: (criterionId: string, next: number) => void;
  onSaveNote: (body: string) => Promise<string | null>;
}

function ScoreSection({
  section,
  criteria,
  scoreMap,
  readOnly,
  initialNoteBody,
  onSelect,
  onSaveNote,
}: ScoreSectionProps) {
  if (criteria.length === 0) return null;

  return (
    <section
      aria-labelledby={`score-section-${section.key}`}
      className="space-y-4 rounded-lg border border-border bg-surface p-4"
    >
      <header className="space-y-1">
        <h3
          id={`score-section-${section.key}`}
          className="text-lg font-semibold text-fg"
        >
          {section.label}
        </h3>
        {section.description ? (
          <p className="text-sm text-fg-muted">{section.description}</p>
        ) : null}
      </header>

      <ul className="space-y-5">
        {criteria.map((c) => {
          const score = scoreMap.has(c.id) ? scoreMap.get(c.id)! : null;
          const ariaLabel = c.label;
          return (
            <li key={c.id} className="space-y-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-fg">{c.label}</p>
                {c.description ? (
                  <p className="text-xs text-fg-muted">{c.description}</p>
                ) : null}
                {score === null ? (
                  <p className="text-xs italic text-fg-muted">
                    — ikke scoret
                  </p>
                ) : null}
              </div>
              <ScoreChipRow
                score={score}
                disabled={readOnly}
                ariaLabel={ariaLabel}
                onSelect={(n) => onSelect(c.id, n)}
              />
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">Huskelapp</p>
        <SectionNotes
          initialBody={initialNoteBody}
          readOnly={readOnly}
          ariaLabel={`Huskelapp for ${section.label}`}
          onSave={onSaveNote}
        />
      </div>
    </section>
  );
}

function toScoreMap(scores: PropertyScore[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of scores) m.set(s.criterion_id, s.score);
  return m;
}
