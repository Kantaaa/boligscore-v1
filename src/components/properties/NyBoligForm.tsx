"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useActiveHousehold } from "@/components/households/ActiveHouseholdProvider";
import type { PropertyStatus } from "@/lib/properties/types";
import { EMPTY_ADDRESS_MESSAGE } from "@/lib/properties/types";
import {
  parseOptionalInt,
  parseOptionalNumber,
  parseOptionalString,
  validateAddress,
} from "@/lib/properties/validation";
import { createProperty } from "@/server/properties/createProperty";

/**
 * Single-page Ny bolig form. Sectioned per the design brief:
 *   - Adresse & FINN-lenke
 *   - Prisinfo (totalpris, omkostninger, felleskostnader)
 *   - Størrelse (BRA, primærrom, soverom, bad)
 *   - Basis-fakta (byggeår, boligtype, etasje)
 *   - Status (dropdown — defaults to `vurderer`)
 *
 * D10 — the "Fra FINN-lenke" tab is intentionally hidden in MVP.
 */
interface NyBoligFormProps {
  statuses: PropertyStatus[];
}

export function NyBoligForm({ statuses }: NyBoligFormProps) {
  const router = useRouter();
  const { activeHouseholdId } = useActiveHousehold();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const defaultStatus =
    statuses.find((s) => s.label === "vurderer") ?? statuses[0];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAddressError(null);

    if (!activeHouseholdId) {
      setError("Velg husholdning før du legger til bolig");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const address = String(fd.get("address") ?? "");
    const v = validateAddress(address);
    if (!v.ok) {
      setAddressError(v.error);
      return;
    }

    const yearBuilt = parseOptionalInt(fd.get("year_built"));

    startTransition(async () => {
      const r = await createProperty({
        householdId: activeHouseholdId,
        address: v.value,
        finn_link: parseOptionalString(fd.get("finn_link")),
        price: parseOptionalInt(fd.get("price")),
        costs: parseOptionalInt(fd.get("costs")),
        monthly_costs: parseOptionalInt(fd.get("monthly_costs")),
        bra: parseOptionalNumber(fd.get("bra")),
        primary_rooms: parseOptionalInt(fd.get("primary_rooms")),
        bedrooms: parseOptionalInt(fd.get("bedrooms")),
        bathrooms: parseOptionalNumber(fd.get("bathrooms")),
        year_built: yearBuilt,
        property_type: parseOptionalString(fd.get("property_type")),
        floor: parseOptionalString(fd.get("floor")),
        status_id: parseOptionalString(fd.get("status_id")),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/app/bolig/${r.data.id}/oversikt`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Section title="Adresse & FINN-lenke">
        <Field label="Adresse" htmlFor="ny-address" required error={addressError}>
          <input
            id="ny-address"
            name="address"
            type="text"
            required
            aria-invalid={addressError ? "true" : "false"}
            aria-describedby={addressError ? "ny-address-error" : undefined}
            placeholder="Storgata 1, 0182 Oslo"
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="FINN-lenke (valgfritt)" htmlFor="ny-finn">
          <input
            id="ny-finn"
            name="finn_link"
            type="url"
            placeholder="https://www.finn.no/realestate/homes/ad.html?finnkode=..."
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </Section>

      <Section title="Prisinfo">
        <Field label="Totalpris (kr)" htmlFor="ny-price">
          <input
            id="ny-price"
            name="price"
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Omkostninger (kr)" htmlFor="ny-costs">
          <input
            id="ny-costs"
            name="costs"
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Felleskostnader (kr/mnd)" htmlFor="ny-monthly">
          <input
            id="ny-monthly"
            name="monthly_costs"
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </Section>

      <Section title="Størrelse">
        <Field label="BRA (m²)" htmlFor="ny-bra">
          <input
            id="ny-bra"
            name="bra"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Primærrom" htmlFor="ny-primary-rooms">
          <input
            id="ny-primary-rooms"
            name="primary_rooms"
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Soverom" htmlFor="ny-bedrooms">
          <input
            id="ny-bedrooms"
            name="bedrooms"
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Bad" htmlFor="ny-bathrooms">
          <input
            id="ny-bathrooms"
            name="bathrooms"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </Section>

      <Section title="Basis-fakta">
        <Field label="Byggeår" htmlFor="ny-year">
          <input
            id="ny-year"
            name="year_built"
            type="number"
            inputMode="numeric"
            min={1800}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Boligtype" htmlFor="ny-type">
          <input
            id="ny-type"
            name="property_type"
            type="text"
            placeholder="Leilighet, enebolig, …"
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Etasje" htmlFor="ny-floor">
          <input
            id="ny-floor"
            name="floor"
            type="text"
            placeholder="2. etasje"
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </Section>

      <Section title="Status">
        <Field label="Velg status" htmlFor="ny-status">
          <select
            id="ny-status"
            name="status_id"
            defaultValue={defaultStatus?.id ?? ""}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-status-bud-inne px-3 py-2 text-sm text-status-bud-inne-fg"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/app")}
          disabled={pending}
          className="min-h-touch rounded-full px-5 text-fg hover:bg-surface-muted"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch rounded-full bg-primary px-6 font-semibold text-primary-fg shadow-md transition hover:bg-primary-dim hover:shadow-lg disabled:opacity-60"
        >
          {pending ? "Lagrer…" : "Legg til bolig"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-headline text-lg font-bold text-fg">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm text-fg-muted">
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-danger">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (påkrevd)</span> : null}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs text-danger"
        >
          {error || EMPTY_ADDRESS_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}
