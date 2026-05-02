"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Modal } from "@/components/households/Modal";
import { canWrite } from "@/lib/households/roles";
import type { HouseholdRole } from "@/lib/households/types";
import type {
  Property,
  PropertyStatus,
} from "@/lib/properties/types";
import {
  DELETE_KEYWORD,
  DELETE_KEYWORD_WRONG_MESSAGE,
} from "@/lib/properties/types";
import { deleteProperty } from "@/server/properties/deleteProperty";
import { setPropertyStatus } from "@/server/properties/setPropertyStatus";

import { StatusBadge } from "./StatusBadge";
import { StatusPicker } from "./StatusPicker";

/**
 * Oversikt tab content. Reads the property + joined status passed by
 * the server component (no fetching here).
 *
 * Owner/member can:
 *   - Tap the status badge → open picker → change status inline.
 *   - Open the danger zone and confirm a typed-keyword delete.
 *
 * Viewers see read-only data (the status badge is rendered as `inline`).
 */
interface OversiktViewProps {
  property: Property;
  status: PropertyStatus;
  statuses: PropertyStatus[];
  myRole: HouseholdRole;
  addedByEmail: string | null;
}

export function OversiktView({
  property,
  status,
  statuses,
  myRole,
  addedByEmail,
}: OversiktViewProps) {
  const router = useRouter();
  const canEdit = canWrite(myRole);

  const [currentStatus, setCurrentStatus] = useState(status);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statusPending, startStatusTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);

  function changeStatus(statusId: string) {
    setStatusError(null);
    const next = statuses.find((s) => s.id === statusId);
    if (!next) return;
    const previous = currentStatus;
    setCurrentStatus(next); // optimistic
    startStatusTransition(async () => {
      const r = await setPropertyStatus(property.id, statusId);
      if (!r.ok) {
        setCurrentStatus(previous); // rollback
        setStatusError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <h2 className="font-headline text-2xl font-extrabold tracking-tight text-fg">
          {property.address}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <StatusBadge
              status={currentStatus}
              variant="interactive"
              onClick={() => setPickerOpen(true)}
              disabled={statusPending}
            />
          ) : (
            <StatusBadge status={currentStatus} variant="inline" />
          )}
          <p className="text-xs text-fg-muted">
            Lagt til av{" "}
            {addedByEmail ?? `tidligere medlem`}
          </p>
        </div>
        {statusError ? (
          <p role="alert" className="text-sm text-status-bud-inne">
            {statusError}
          </p>
        ) : null}
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact label="Pris" value={fmtNok(property.price)} />
        <Fact label="Omkostninger" value={fmtNok(property.costs)} />
        <Fact label="Felleskostnader (mnd)" value={fmtNok(property.monthly_costs)} />
        <Fact
          label="BRA"
          value={property.bra != null ? `${property.bra} m²` : "—"}
        />
        <Fact label="Primærrom" value={fmt(property.primary_rooms)} />
        <Fact label="Soverom" value={fmt(property.bedrooms)} />
        <Fact label="Bad" value={fmt(property.bathrooms)} />
        <Fact label="Byggeår" value={fmt(property.year_built)} />
        <Fact label="Boligtype" value={property.property_type ?? "—"} />
        <Fact label="Etasje" value={property.floor ?? "—"} />
      </dl>

      {property.finn_link ? (
        <p>
          <a
            href={property.finn_link}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline"
          >
            Åpne på FINN ↗
          </a>
        </p>
      ) : null}

      <p className="text-xs text-fg-muted">
        Opprettet {fmtDate(property.created_at)} — sist endret{" "}
        {fmtDate(property.updated_at)}
      </p>

      {canEdit ? (
        <DangerZone
          propertyId={property.id}
          address={property.address}
          onDeleted={() => {
            router.push("/app");
            router.refresh();
          }}
        />
      ) : null}

      <StatusPicker
        statuses={statuses}
        currentStatusId={currentStatus.id}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={changeStatus}
      />
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
      <dt className="text-xs uppercase tracking-wide text-fg-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

function fmt(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}

function fmtNok(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `${amount.toLocaleString("nb-NO")} kr`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("nb-NO");
  } catch {
    return iso;
  }
}

function DangerZone({
  propertyId,
  address,
  onDeleted,
}: {
  propertyId: string;
  address: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function go() {
    setError(null);
    startTransition(async () => {
      const r = await deleteProperty(propertyId, typed);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      onDeleted();
    });
  }

  const matchOk =
    typed.trim().toLowerCase() === DELETE_KEYWORD;

  return (
    <section
      aria-labelledby="property-danger-heading"
      className="space-y-3 rounded-xl bg-surface p-5 shadow-sm"
    >
      <h3
        id="property-danger-heading"
        className="font-headline text-lg font-bold text-danger"
      >
        Faresone
      </h3>
      <p className="text-sm text-fg-muted">
        Sletter boligen og alle tilhørende score / notater permanent.
      </p>
      <button
        type="button"
        onClick={() => {
          setTyped("");
          setError(null);
          setOpen(true);
        }}
        className="min-h-touch rounded-full bg-danger px-5 text-sm font-medium text-danger-fg shadow-sm hover:brightness-110"
      >
        Slett bolig
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="delete-property-title"
      >
        <h3 id="delete-property-title" className="text-lg font-semibold">
          Slett bolig?
        </h3>
        <p className="mt-2 text-sm text-fg-muted">
          Du sletter «{address}». Skriv «{DELETE_KEYWORD}» for å bekrefte.
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label={`Skriv «${DELETE_KEYWORD}» for å bekrefte`}
          className="mt-3 w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
          autoFocus
        />
        {error ? (
          <p className="mt-2 text-sm text-status-bud-inne">{error}</p>
        ) : null}
        {!matchOk && typed.length > 0 ? (
          <p className="mt-1 text-xs text-fg-muted">
            {DELETE_KEYWORD_WRONG_MESSAGE}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="min-h-touch rounded-md px-4 text-fg hover:bg-surface-raised"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={go}
            disabled={pending || !matchOk}
            className="min-h-touch rounded-md bg-status-bud-inne px-4 text-white disabled:opacity-50"
          >
            Slett permanent
          </button>
        </div>
      </Modal>
    </section>
  );
}
