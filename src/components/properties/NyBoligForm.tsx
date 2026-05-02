"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useActiveHousehold } from "@/components/households/ActiveHouseholdProvider";
import type { ParsedListing, ParseResult } from "@/lib/finn/types";
import { FINN_ERROR_MESSAGES } from "@/lib/finn/types";
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
 * Single-page Ny bolig form. Tab strip on top:
 *   - Fra FINN-lenke (default per spec) — paste a URL, "Hent fra FINN"
 *     POSTs to /api/properties/parse-finn, prefills the manual fields,
 *     and switches to the Manual tab.
 *   - Manuelt — the original sectioned form (unchanged behaviour).
 *
 * Sections:
 *   - Adresse & FINN-lenke
 *   - Prisinfo (totalpris, omkostninger, felleskostnader)
 *   - Størrelse (BRA, primærrom, soverom, bad)
 *   - Basis-fakta (byggeår, boligtype, etasje)
 *   - Status (dropdown — defaults to `vurderer`)
 *
 * The form is controlled (single `formValues` state) so the FINN parse
 * can prefill arbitrary fields. Submit goes through `createProperty`
 * exactly as before — D9 keeps the manual form as the source of truth.
 */
interface NyBoligFormProps {
  statuses: PropertyStatus[];
}

type Tab = "finn" | "manual";

interface FormValues {
  address: string;
  finn_link: string;
  price: string;
  costs: string;
  monthly_costs: string;
  bra: string;
  primary_rooms: string;
  bedrooms: string;
  bathrooms: string;
  year_built: string;
  property_type: string;
  floor: string;
  status_id: string;
  /** Set by the FINN parser — submitted unchanged unless cleared. */
  image_url: string;
}

const EMPTY_VALUES: Omit<FormValues, "status_id"> = {
  address: "",
  finn_link: "",
  price: "",
  costs: "",
  monthly_costs: "",
  bra: "",
  primary_rooms: "",
  bedrooms: "",
  bathrooms: "",
  year_built: "",
  property_type: "",
  floor: "",
  image_url: "",
};

/** Norwegian labels mirroring the ParsedListing keys, for the success notice. */
const FIELD_LABELS_NO: Record<string, string> = {
  address: "adresse",
  price: "pris",
  bra: "BRA",
  primary_rooms: "primærrom",
  bedrooms: "soverom",
  bathrooms: "bad",
  year_built: "byggeår",
  property_type: "boligtype",
  image_url: "bilde",
};

export function NyBoligForm({ statuses }: NyBoligFormProps) {
  const router = useRouter();
  const { activeHouseholdId } = useActiveHousehold();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const defaultStatus =
    statuses.find((s) => s.label === "vurderer") ?? statuses[0];

  const [tab, setTab] = useState<Tab>("finn");
  const [values, setValues] = useState<FormValues>({
    ...EMPTY_VALUES,
    status_id: defaultStatus?.id ?? "",
  });

  // FINN tab state.
  const [finnUrl, setFinnUrl] = useState<string>("");
  const [finnError, setFinnError] = useState<string | null>(null);
  const [finnLoading, setFinnLoading] = useState<boolean>(false);
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);
  const finnInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the FINN input when the FINN tab is active (spec
  // "Default tab is FINN" — input should have focus on landing).
  useEffect(() => {
    if (tab === "finn") {
      finnInputRef.current?.focus();
    }
  }, [tab]);

  function setField<K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onFetchFinn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFinnError(null);
    setPrefillNotice(null);

    const url = finnUrl.trim();
    if (!url) {
      setFinnError(FINN_ERROR_MESSAGES.missingUrl);
      return;
    }

    setFinnLoading(true);
    let result: ParseResult | null = null;
    try {
      const res = await fetch("/api/properties/parse-finn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      result = (await res.json()) as ParseResult;
    } catch {
      setFinnLoading(false);
      setFinnError(FINN_ERROR_MESSAGES.unexpected);
      return;
    }
    setFinnLoading(false);

    if (!result || !result.ok) {
      setFinnError(result?.error ?? FINN_ERROR_MESSAGES.unexpected);
      return;
    }

    applyParsedListing(result.data, url);
  }

  function applyParsedListing(parsed: ParsedListing, sourceUrl: string) {
    setValues((prev) => ({
      ...prev,
      address: parsed.address ?? prev.address,
      finn_link: sourceUrl,
      price: parsed.price != null ? String(parsed.price) : prev.price,
      bra: parsed.bra != null ? String(parsed.bra) : prev.bra,
      primary_rooms:
        parsed.primary_rooms != null
          ? String(parsed.primary_rooms)
          : prev.primary_rooms,
      bedrooms:
        parsed.bedrooms != null ? String(parsed.bedrooms) : prev.bedrooms,
      bathrooms:
        parsed.bathrooms != null
          ? String(parsed.bathrooms)
          : prev.bathrooms,
      year_built:
        parsed.year_built != null
          ? String(parsed.year_built)
          : prev.year_built,
      property_type: parsed.property_type ?? prev.property_type,
      image_url: parsed.image_url ?? prev.image_url,
    }));

    const labels = parsed.extracted_fields
      .map((k) => FIELD_LABELS_NO[k] ?? k)
      .join(", ");
    const n = parsed.extracted_fields.length;
    const notice =
      n === 0
        ? "Fant ingen felter på FINN-siden — fyll inn manuelt."
        : `Hentet ${n} felter fra FINN — sjekk og rediger ved behov. (${labels})`;
    setPrefillNotice(notice);
    setTab("manual");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAddressError(null);

    if (!activeHouseholdId) {
      setError("Velg husholdning før du legger til bolig");
      return;
    }

    const v = validateAddress(values.address);
    if (!v.ok) {
      setAddressError(v.error);
      return;
    }

    startTransition(async () => {
      const r = await createProperty({
        householdId: activeHouseholdId,
        address: v.value,
        finn_link: parseOptionalString(values.finn_link),
        price: parseOptionalInt(values.price),
        costs: parseOptionalInt(values.costs),
        monthly_costs: parseOptionalInt(values.monthly_costs),
        bra: parseOptionalNumber(values.bra),
        primary_rooms: parseOptionalInt(values.primary_rooms),
        bedrooms: parseOptionalInt(values.bedrooms),
        bathrooms: parseOptionalNumber(values.bathrooms),
        year_built: parseOptionalInt(values.year_built),
        property_type: parseOptionalString(values.property_type),
        floor: parseOptionalString(values.floor),
        status_id: parseOptionalString(values.status_id),
        image_url: parseOptionalString(values.image_url),
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
    <div className="space-y-6">
      <Tabs tab={tab} onChange={setTab} />

      {tab === "finn" ? (
        <FinnTab
          url={finnUrl}
          onUrlChange={setFinnUrl}
          onSubmit={onFetchFinn}
          loading={finnLoading}
          error={finnError}
          onSwitchToManual={() => setTab("manual")}
          inputRef={finnInputRef}
        />
      ) : (
        <ManualTab
          values={values}
          onChange={setField}
          statuses={statuses}
          addressError={addressError}
          submitError={error}
          prefillNotice={prefillNotice}
          onDismissNotice={() => setPrefillNotice(null)}
          pending={pending}
          onSubmit={onSubmit}
          onCancel={() => router.push("/app")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab strip
// ---------------------------------------------------------------------------

function Tabs({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (next: Tab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Hvordan legge til bolig"
      className="-mx-4 overflow-x-auto bg-surface-raised hide-scrollbar"
    >
      <ul className="flex min-w-max gap-6 px-4 sm:px-6">
        <li>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "finn"}
            onClick={() => onChange("finn")}
            className={[
              "inline-flex min-h-touch items-center whitespace-nowrap py-3 text-sm transition",
              "border-b-2",
              tab === "finn"
                ? "border-primary font-bold text-primary"
                : "border-transparent font-medium text-fg-muted hover:text-fg",
            ].join(" ")}
          >
            Fra FINN-lenke
          </button>
        </li>
        <li>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "manual"}
            onClick={() => onChange("manual")}
            className={[
              "inline-flex min-h-touch items-center whitespace-nowrap py-3 text-sm transition",
              "border-b-2",
              tab === "manual"
                ? "border-primary font-bold text-primary"
                : "border-transparent font-medium text-fg-muted hover:text-fg",
            ].join(" ")}
          >
            Manuelt
          </button>
        </li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FINN tab
// ---------------------------------------------------------------------------

function FinnTab({
  url,
  onUrlChange,
  onSubmit,
  loading,
  error,
  onSwitchToManual,
  inputRef,
}: {
  url: string;
  onUrlChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  onSwitchToManual: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4"
      aria-labelledby="finn-tab-heading"
    >
      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <h2
          id="finn-tab-heading"
          className="font-headline text-lg font-bold text-fg"
        >
          Lim inn FINN-lenke
        </h2>
        <p className="text-sm text-fg-muted">
          Vi henter adresse, pris, størrelse og bilde automatisk. Du kan
          rette på alt før du lagrer.
        </p>
        <div className="space-y-1">
          <label htmlFor="ny-finn-url" className="block text-sm text-fg-muted">
            FINN-lenke
            <span aria-hidden className="ml-1 text-danger">
              *
            </span>
            <span className="sr-only"> (påkrevd)</span>
          </label>
          <input
            ref={inputRef}
            id="ny-finn-url"
            name="finn_url"
            type="url"
            required
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://www.finn.no/realestate/homes/ad.html?finnkode=..."
            disabled={loading}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "finn-url-error" : undefined}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          />
          {error ? (
            <p id="finn-url-error" role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSwitchToManual}
          className="text-sm font-medium text-primary underline decoration-dotted underline-offset-2 hover:text-primary-dim"
        >
          Eller fyll inn manuelt
        </button>
        <button
          type="submit"
          disabled={loading}
          className="min-h-touch rounded-full bg-primary px-6 font-semibold text-primary-fg shadow-md transition hover:bg-primary-dim hover:shadow-lg disabled:opacity-60"
        >
          {loading ? "Henter…" : "Hent fra FINN"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Manual tab — controlled fields driven by `values`
// ---------------------------------------------------------------------------

function ManualTab({
  values,
  onChange,
  statuses,
  addressError,
  submitError,
  prefillNotice,
  onDismissNotice,
  pending,
  onSubmit,
  onCancel,
}: {
  values: FormValues;
  onChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  statuses: PropertyStatus[];
  addressError: string | null;
  submitError: string | null;
  prefillNotice: string | null;
  onDismissNotice: () => void;
  pending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {prefillNotice ? (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-md bg-surface-muted px-3 py-2 text-sm text-fg"
        >
          <span>{prefillNotice}</span>
          <button
            type="button"
            onClick={onDismissNotice}
            aria-label="Lukk melding"
            className="text-fg-muted hover:text-fg"
          >
            ✕
          </button>
        </div>
      ) : null}

      <Section title="Adresse & FINN-lenke">
        <Field label="Adresse" htmlFor="ny-address" required error={addressError}>
          <input
            id="ny-address"
            name="address"
            type="text"
            required
            value={values.address}
            onChange={(e) => onChange("address", e.target.value)}
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
            value={values.finn_link}
            onChange={(e) => onChange("finn_link", e.target.value)}
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
            value={values.price}
            onChange={(e) => onChange("price", e.target.value)}
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
            value={values.costs}
            onChange={(e) => onChange("costs", e.target.value)}
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
            value={values.monthly_costs}
            onChange={(e) => onChange("monthly_costs", e.target.value)}
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
            value={values.bra}
            onChange={(e) => onChange("bra", e.target.value)}
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
            value={values.primary_rooms}
            onChange={(e) => onChange("primary_rooms", e.target.value)}
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
            value={values.bedrooms}
            onChange={(e) => onChange("bedrooms", e.target.value)}
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
            value={values.bathrooms}
            onChange={(e) => onChange("bathrooms", e.target.value)}
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
            value={values.year_built}
            onChange={(e) => onChange("year_built", e.target.value)}
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Boligtype" htmlFor="ny-type">
          <input
            id="ny-type"
            name="property_type"
            type="text"
            value={values.property_type}
            onChange={(e) => onChange("property_type", e.target.value)}
            placeholder="Leilighet, enebolig, …"
            className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="Etasje" htmlFor="ny-floor">
          <input
            id="ny-floor"
            name="floor"
            type="text"
            value={values.floor}
            onChange={(e) => onChange("floor", e.target.value)}
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
            value={values.status_id}
            onChange={(e) => onChange("status_id", e.target.value)}
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

      {/* Hidden field — image_url comes from FINN, never user-edited here. */}
      <input type="hidden" name="image_url" value={values.image_url} />

      {submitError ? (
        <p
          role="alert"
          className="rounded-md bg-status-bud-inne px-3 py-2 text-sm text-status-bud-inne-fg"
        >
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
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
