import { formatAlder, formatPrisPerKvm, formatStorrelse } from "@/lib/scoring/fakta";

interface FaktaSectionProps {
  price: number | null;
  bra: number | null;
  yearBuilt: number | null;
}

/**
 * Read-only "Fakta" panel above the scored sections (D6, D10).
 *
 * Three values, all computed on the fly:
 *  - Pris/kvm = price / bra
 *  - Størrelse = bra m²
 *  - Alder = current_year - year_built
 *
 * Missing inputs render as "—" (em-dash). No chips, no inputs — this
 * is a presentational summary only.
 *
 * Server component (no `"use client"`): values come from props and
 * never need re-rendering after mount. The current year is computed at
 * SSR time, which is acceptable since the diff matters in years not
 * seconds.
 */
export function FaktaSection({ price, bra, yearBuilt }: FaktaSectionProps) {
  const pris = formatPrisPerKvm(price, bra);
  const storrelse = formatStorrelse(bra);
  const alder = formatAlder(yearBuilt);

  return (
    <section
      aria-labelledby="fakta-heading"
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <header className="space-y-1">
        <h2 id="fakta-heading" className="text-lg font-semibold text-fg">
          Fakta
        </h2>
        <p className="text-sm text-fg-muted">
          Auto-beregnede tall fra boligens grunnlagsdata.
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FaktaItem label="Pris/kvm" value={pris} />
        <FaktaItem label="Størrelse (BRA)" value={storrelse} />
        <FaktaItem label="Alder" value={alder} />
      </dl>
    </section>
  );
}

function FaktaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-bg p-3">
      <dt className="text-xs uppercase tracking-wide text-fg-muted">{label}</dt>
      <dd className="mt-1 text-base font-medium tabular-nums text-fg">
        {value}
      </dd>
    </div>
  );
}
