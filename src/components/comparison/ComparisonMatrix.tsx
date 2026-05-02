"use client";

import { useMemo } from "react";

import type { ComparisonRow } from "@/lib/comparison/types";

import { MatrixRow } from "./MatrixRow";

interface ComparisonMatrixProps {
  rows: ComparisonRow[];
  /** Display name for the viewer's column header. */
  yourName: string;
  /** Display name for the partner's column header (null in single-member). */
  partnerName: string | null;
  /** Threshold used to highlight disagreement rows. */
  threshold: number;
  /** Member count drives column variants — see MatrixRow. */
  memberCount: number;
  /** True for viewers — Felles cells render disabled. */
  readOnly: boolean;
  /** When the user picks a chip in the popover. */
  onSetFelles: (criterionId: string, score: number) => void;
  /** When the user clears felles via the popover. */
  onClearFelles: (criterionId: string) => void;
}

/**
 * Three section blocks; each block lists its criteria as `<MatrixRow>`.
 * The header row of column labels lives at the top of each section so
 * mobile users keep context as they scroll.
 */
export function ComparisonMatrix({
  rows,
  yourName,
  partnerName,
  threshold,
  memberCount,
  readOnly,
  onSetFelles,
  onClearFelles,
}: ComparisonMatrixProps) {
  // Group rows by section_id, preserving sort order.
  const sections = useMemo(() => {
    const sectionMap = new Map<
      string,
      {
        section_id: string;
        section_label: string;
        section_sort_order: number;
        rows: ComparisonRow[];
      }
    >();
    for (const r of rows) {
      const block = sectionMap.get(r.section_id) ?? {
        section_id: r.section_id,
        section_label: r.section_label,
        section_sort_order: r.section_sort_order,
        rows: [],
      };
      block.rows.push(r);
      sectionMap.set(r.section_id, block);
    }
    const list = Array.from(sectionMap.values());
    list.sort((a, b) => a.section_sort_order - b.section_sort_order);
    for (const block of list) {
      block.rows.sort((a, b) => a.criterion_sort_order - b.criterion_sort_order);
    }
    return list;
  }, [rows]);

  const isFullMatrix = memberCount === 2;

  return (
    <div className="space-y-4">
      {sections.map((block) => (
        <section
          key={block.section_id}
          aria-labelledby={`comparison-section-${block.section_id}`}
          className="space-y-3 rounded-xl bg-surface p-5 shadow-sm"
        >
          <h3
            id={`comparison-section-${block.section_id}`}
            className="font-headline text-xl font-bold text-fg"
          >
            {block.section_label}
          </h3>

          {/* Column header — labels match the variant's columns. */}
          <div
            className={[
              "grid items-center gap-2 px-2 pb-1 text-xs font-medium uppercase tracking-wide text-fg-muted",
              isFullMatrix
                ? "grid-cols-[2fr_repeat(4,minmax(0,1fr))]"
                : "grid-cols-[2fr_minmax(0,1fr)_minmax(0,1fr)]",
            ].join(" ")}
            role="presentation"
          >
            <span>Kriterium</span>
            <span className="text-center">{yourName}</span>
            {isFullMatrix ? (
              <>
                <span className="text-center">{partnerName ?? "Partner"}</span>
                <span className="text-center">Snitt</span>
              </>
            ) : null}
            <span className="text-center">Felles</span>
          </div>

          <ul className="divide-y divide-border-soft">
            {block.rows.map((row) => (
              <MatrixRow
                key={row.criterion_id}
                row={row}
                isFullMatrix={isFullMatrix}
                threshold={threshold}
                readOnly={readOnly}
                yourName={yourName}
                partnerName={partnerName}
                onSetFelles={(score) => onSetFelles(row.criterion_id, score)}
                onClearFelles={() => onClearFelles(row.criterion_id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
