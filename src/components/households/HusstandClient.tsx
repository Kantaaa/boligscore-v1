"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acceptInvitation } from "@/server/households/acceptInvitation"; // (only types reuse)
import { createInvitation } from "@/server/households/createInvitation";
import { deleteHousehold } from "@/server/households/deleteHousehold";
import { leaveHousehold } from "@/server/households/leaveHousehold";
import { removeMember } from "@/server/households/removeMember";
import { renameHousehold } from "@/server/households/renameHousehold";
import { revokeInvitation } from "@/server/households/revokeInvitation";
import { setMemberRole } from "@/server/households/setMemberRole";
import { canManage } from "@/lib/households/roles";
import type {
  HouseholdInvitation,
  HouseholdRole,
  HouseholdWithMembers,
} from "@/lib/households/types";

import { Modal } from "./Modal";
import { RoleBadge } from "./RoleBadge";

void acceptInvitation; // keep import alive for future linkage; no-op

interface Props {
  data: HouseholdWithMembers;
  invitations: HouseholdInvitation[];
  currentUserId: string;
  myRole: HouseholdRole;
  origin: string;
}

export function HusstandClient({
  data,
  invitations,
  currentUserId,
  myRole,
  origin,
}: Props) {
  const router = useRouter();
  const isOwner = canManage(myRole);

  return (
    <div className="space-y-8">
      <HouseholdNameSection
        id={data.household.id}
        name={data.household.name}
        canEdit={isOwner}
        onSaved={() => router.refresh()}
      />

      <MembersSection
        householdId={data.household.id}
        members={data.members}
        currentUserId={currentUserId}
        isOwner={isOwner}
        onChanged={() => router.refresh()}
      />

      <InvitationsSection
        householdId={data.household.id}
        invitations={invitations}
        origin={origin}
        myRole={myRole}
        onChanged={() => router.refresh()}
      />

      {!isOwner ? (
        <LeaveSection
          householdId={data.household.id}
          onLeft={() => router.refresh()}
        />
      ) : null}

      {isOwner ? (
        <DangerZoneSection
          householdId={data.household.id}
          name={data.household.name}
          onDeleted={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

// --- Household name ----------------------------------------------------------

function HouseholdNameSection({
  id,
  name,
  canEdit,
  onSaved,
}: {
  id: string;
  name: string;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await renameHousehold(id, draft);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEditing(false);
      onSaved();
    });
  }

  return (
    <section aria-labelledby="hh-name-heading" className="space-y-2">
      <h2 id="hh-name-heading" className="text-lg font-semibold">
        Husholdning
      </h2>
      {!editing ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-3 py-2">
          <span className="text-fg">{name}</span>
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              className="min-h-touch rounded-md px-3 text-sm text-primary hover:bg-primary/10"
            >
              Endre navn
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm text-fg-muted" htmlFor="hh-name-input">
            Navn på husholdningen
          </label>
          <input
            id="hh-name-input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
          />
          {error ? <p className="text-sm text-status-bud-inne">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="min-h-touch rounded-md bg-primary px-4 text-primary-fg disabled:opacity-60"
            >
              Lagre
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className="min-h-touch rounded-md px-4 text-fg hover:bg-surface-raised"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// --- Members -----------------------------------------------------------------

function MembersSection({
  householdId,
  members,
  currentUserId,
  isOwner,
  onChanged,
}: {
  householdId: string;
  members: HouseholdWithMembers["members"];
  currentUserId: string;
  isOwner: boolean;
  onChanged: () => void;
}) {
  return (
    <section aria-labelledby="hh-members-heading" className="space-y-3">
      <h2 id="hh-members-heading" className="text-lg font-semibold">
        Medlemmer ({members.length})
      </h2>
      <ul className="space-y-2">
        {members.map((m) => (
          <MemberRow
            key={m.user_id}
            householdId={householdId}
            member={m}
            currentUserId={currentUserId}
            isOwner={isOwner}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </section>
  );
}

function MemberRow({
  householdId,
  member,
  currentUserId,
  isOwner,
  onChanged,
}: {
  householdId: string;
  member: HouseholdWithMembers["members"][number];
  currentUserId: string;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isSelf = member.user_id === currentUserId;
  const canEditRole = isOwner && !isSelf;
  const canRemove = isOwner && !isSelf;

  function changeRole(role: HouseholdRole) {
    setError(null);
    startTransition(async () => {
      const r = await setMemberRole(householdId, member.user_id, role);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onChanged();
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const r = await removeMember(householdId, member.user_id);
      if (!r.ok) {
        setError(r.error);
        setConfirmRemove(false);
        return;
      }
      setConfirmRemove(false);
      onChanged();
    });
  }

  return (
    <li className="rounded-md border border-border bg-surface-raised px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-fg" aria-label="Medlem">
            {member.email ?? member.user_id.slice(0, 8) + "…"}
            {isSelf ? <span className="text-fg-muted"> (deg)</span> : null}
          </span>
          <RoleBadge role={member.role} />
        </div>
        <div className="flex items-center gap-2">
          {canEditRole ? (
            <select
              aria-label={`Endre rolle for ${member.email ?? member.user_id}`}
              value={member.role}
              disabled={pending}
              onChange={(e) => changeRole(e.target.value as HouseholdRole)}
              className="min-h-touch rounded-md border border-border bg-surface px-2 text-sm"
            >
              <option value="owner">Eier</option>
              <option value="member">Medlem</option>
              <option value="viewer">Observatør</option>
            </select>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              disabled={pending}
              className="min-h-touch rounded-md px-3 text-sm text-status-bud-inne hover:bg-status-bud-inne/10"
            >
              Fjern
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-status-bud-inne">{error}</p>
      ) : null}

      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        labelledBy={`remove-${member.user_id}-title`}
      >
        <h3
          id={`remove-${member.user_id}-title`}
          className="text-lg font-semibold"
        >
          Fjern medlem?
        </h3>
        <p className="mt-2 text-fg-muted">
          {member.email ?? "Dette medlemmet"} vil ikke lenger ha tilgang til
          husholdningen.
        </p>
        {error ? (
          <p className="mt-2 text-sm text-status-bud-inne">{error}</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmRemove(false)}
            disabled={pending}
            className="min-h-touch rounded-md px-4 text-fg hover:bg-surface-raised"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="min-h-touch rounded-md bg-status-bud-inne px-4 text-white"
          >
            Fjern
          </button>
        </div>
      </Modal>
    </li>
  );
}

// --- Invitations -------------------------------------------------------------

function InvitationsSection({
  householdId,
  invitations,
  origin,
  myRole,
  onChanged,
}: {
  householdId: string;
  invitations: HouseholdInvitation[];
  origin: string;
  myRole: HouseholdRole;
  onChanged: () => void;
}) {
  const [role, setRole] = useState<HouseholdRole>("member");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const canCreate = myRole === "owner" || myRole === "member";

  function create() {
    setError(null);
    setCreatedLink(null);
    startTransition(async () => {
      const r = await createInvitation({ householdId, role });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const link = `${origin}/invitasjon/${r.data.token}`;
      setCreatedLink(link);
      onChanged();
    });
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // fall back: prompt
      window.prompt("Kopier lenken manuelt:", link);
    }
  }

  function revoke(id: string) {
    startTransition(async () => {
      const r = await revokeInvitation(id);
      if (!r.ok) setError(r.error);
      onChanged();
    });
  }

  const pending_invs = invitations.filter((i) => i.accepted_by === null);

  return (
    <section aria-labelledby="hh-inv-heading" className="space-y-3">
      <h2 id="hh-inv-heading" className="text-lg font-semibold">
        Invitasjoner
      </h2>

      {canCreate ? (
        <div className="space-y-2 rounded-md border border-border bg-surface-raised p-3">
          <label className="block text-sm text-fg-muted" htmlFor="inv-role">
            Rolle for ny invitasjon
          </label>
          <select
            id="inv-role"
            value={role}
            onChange={(e) => setRole(e.target.value as HouseholdRole)}
            disabled={pending}
            className="min-h-touch w-full rounded-md border border-border bg-surface px-2 text-sm"
          >
            <option value="member">Medlem (kan score og redigere)</option>
            <option value="owner">Eier (kan også styre husholdningen)</option>
            <option value="viewer">Observatør (kun lesetilgang)</option>
          </select>
          <button
            type="button"
            onClick={create}
            disabled={pending}
            className="min-h-touch w-full rounded-md bg-primary px-4 text-primary-fg disabled:opacity-60"
          >
            Generer invitasjonslenke
          </button>
          {error ? (
            <p className="text-sm text-status-bud-inne">{error}</p>
          ) : null}
          {createdLink ? (
            <div className="mt-2 space-y-2 rounded-md border border-border bg-surface p-2">
              <p className="text-xs text-fg-muted">
                Send denne lenken til personen du vil invitere. Lenken
                utløper om 7 dager.
              </p>
              <code className="block break-all rounded bg-bg p-2 text-xs">
                {createdLink}
              </code>
              <button
                type="button"
                onClick={() => copyLink(createdLink)}
                className="min-h-touch w-full rounded-md border border-border bg-surface-raised px-3 text-sm font-medium"
              >
                {copyState === "copied" ? "Kopiert ✓" : "Kopier lenke"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {pending_invs.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-fg-muted">
            Aktive invitasjoner
          </h3>
          <ul className="space-y-2">
            {pending_invs.map((inv) => {
              const link = `${origin}/invitasjon/${inv.token}`;
              const expired = new Date(inv.expires_at).getTime() <= Date.now();
              return (
                <li
                  key={inv.id}
                  className="space-y-2 rounded-md border border-border bg-surface-raised p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={inv.role} />
                      <span className="text-xs text-fg-muted">
                        {expired
                          ? "● Utløpt"
                          : `Utløper ${new Date(
                              inv.expires_at,
                            ).toLocaleDateString("nb-NO")}`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => copyLink(link)}
                        className="min-h-touch rounded-md border border-border bg-surface px-3 text-sm"
                      >
                        Kopier lenke
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(inv.id)}
                        disabled={pending}
                        className="min-h-touch rounded-md px-3 text-sm text-status-bud-inne hover:bg-status-bud-inne/10"
                      >
                        Trekk tilbake
                      </button>
                    </div>
                  </div>
                  <code className="block break-all rounded bg-bg p-2 text-xs">
                    {link}
                  </code>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// --- Leave -------------------------------------------------------------------

function LeaveSection({
  householdId,
  onLeft,
}: {
  householdId: string;
  onLeft: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function go() {
    setError(null);
    startTransition(async () => {
      const r = await leaveHousehold(householdId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      onLeft();
    });
  }

  return (
    <section aria-labelledby="hh-leave-heading" className="space-y-2">
      <h2 id="hh-leave-heading" className="text-lg font-semibold">
        Forlat husholdning
      </h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-touch rounded-md border border-status-bud-inne/60 bg-status-bud-inne/10 px-4 text-status-bud-inne"
      >
        Forlat husholdning
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="leave-modal-title"
      >
        <h3 id="leave-modal-title" className="text-lg font-semibold">
          Forlate husholdningen?
        </h3>
        <p className="mt-2 text-fg-muted">
          Du vil ikke lenger ha tilgang til boliger og scoring i denne
          husholdningen.
        </p>
        {error ? (
          <p className="mt-2 text-sm text-status-bud-inne">{error}</p>
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
            disabled={pending}
            className="min-h-touch rounded-md bg-status-bud-inne px-4 text-white"
          >
            Forlat
          </button>
        </div>
      </Modal>
    </section>
  );
}

// --- Danger zone (delete household) -----------------------------------------

function DangerZoneSection({
  householdId,
  name,
  onDeleted,
}: {
  householdId: string;
  name: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function go() {
    setError(null);
    startTransition(async () => {
      const r = await deleteHousehold(householdId, typed);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      onDeleted();
    });
  }

  return (
    <section
      aria-labelledby="hh-danger-heading"
      className="space-y-2 rounded-md border border-status-bud-inne/40 p-3"
    >
      <h2
        id="hh-danger-heading"
        className="text-lg font-semibold text-status-bud-inne"
      >
        Faresone
      </h2>
      <p className="text-sm text-fg-muted">
        Sletting fjerner alle data permanent: medlemmer, invitasjoner,
        boliger, score og vekter.
      </p>
      <button
        type="button"
        onClick={() => {
          setTyped("");
          setOpen(true);
        }}
        className="min-h-touch rounded-md bg-status-bud-inne px-4 text-white"
      >
        Slett husholdning
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="delete-modal-title"
      >
        <h3 id="delete-modal-title" className="text-lg font-semibold">
          Slett husholdning?
        </h3>
        <p className="mt-2 text-fg-muted">
          Denne handlingen kan ikke angres. Skriv inn navnet på husholdningen
          for å bekrefte:
        </p>
        <p className="mt-2 rounded-md bg-surface-raised p-2 font-mono text-sm">
          {name}
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label="Skriv inn navnet på husholdningen for å bekrefte"
          className="mt-2 w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
          autoFocus
        />
        {error ? (
          <p className="mt-2 text-sm text-status-bud-inne">{error}</p>
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
            disabled={pending || typed.trim() !== name}
            className="min-h-touch rounded-md bg-status-bud-inne px-4 text-white disabled:opacity-50"
          >
            Slett permanent
          </button>
        </div>
      </Modal>
    </section>
  );
}
