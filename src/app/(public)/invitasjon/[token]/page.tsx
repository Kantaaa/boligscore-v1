import Link from "next/link";
import { redirect } from "next/navigation";

import { InvitationAcceptClient } from "@/components/households/InvitationAcceptClient";
import { roleLabel } from "@/lib/households/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInvitationByToken } from "@/server/households/getInvitationByToken";

export const dynamic = "force-dynamic";

/**
 * Invitation acceptance page (`/invitasjon/[token]`).
 *
 * Flow:
 *   1. Read the invitation via the SECURITY DEFINER RPC. Anonymous
 *      callers can hit this — required so the page renders before
 *      sign-up.
 *   2. If unauthenticated → redirect to /registrer?next=/invitasjon/<token>.
 *   3. If expired → show "Denne lenken har utløpt. Be om en ny.".
 *   4. If accepted_by is non-null → show "already used".
 *   5. If user is already a member → show "Du er allerede medlem ..." +
 *      a button to switch active household.
 *   6. Otherwise render the "Bli med" CTA via the client component.
 */
export default async function InvitasjonPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await getInvitationByToken(params.token);

  if (!result.ok) {
    return (
      <PageShell>
        <h1 className="text-2xl font-semibold">Ugyldig invitasjon</h1>
        <p className="text-fg-muted">
          Vi fant ikke denne invitasjonen. Den kan ha blitt slettet eller
          aldri ha eksistert.
        </p>
      </PageShell>
    );
  }

  const inv = result.data;
  const expired = new Date(inv.expires_at).getTime() <= Date.now();
  const acceptedAlready = inv.accepted_by !== null;

  // Auth check — must come AFTER the public RPC read so we can show a
  // friendly message on expired/accepted before bouncing to /registrer.
  const supabase = createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();

  if (!u.user) {
    if (expired) {
      return (
        <PageShell>
          <h1 className="text-2xl font-semibold">Lenken har utløpt</h1>
          <p className="text-fg-muted">Denne lenken har utløpt. Be om en ny.</p>
        </PageShell>
      );
    }
    if (acceptedAlready) {
      return (
        <PageShell>
          <h1 className="text-2xl font-semibold">Allerede brukt</h1>
          <p className="text-fg-muted">Denne invitasjonen er allerede brukt.</p>
        </PageShell>
      );
    }
    redirect(`/registrer?next=${encodeURIComponent(`/invitasjon/${params.token}`)}`);
  }

  if (expired) {
    return (
      <PageShell>
        <h1 className="text-2xl font-semibold">Lenken har utløpt</h1>
        <p className="text-fg-muted">Denne lenken har utløpt. Be om en ny.</p>
        <Link
          href="/app"
          className="mt-4 inline-flex min-h-touch items-center rounded-md bg-primary px-4 text-primary-fg"
        >
          Gå til Boliger
        </Link>
      </PageShell>
    );
  }

  if (acceptedAlready) {
    return (
      <PageShell>
        <h1 className="text-2xl font-semibold">Allerede brukt</h1>
        <p className="text-fg-muted">Denne invitasjonen er allerede brukt.</p>
        <Link
          href="/app"
          className="mt-4 inline-flex min-h-touch items-center rounded-md bg-primary px-4 text-primary-fg"
        >
          Gå til Boliger
        </Link>
      </PageShell>
    );
  }

  // User is authenticated — check membership.
  const { data: existing } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", inv.household_id)
    .eq("user_id", u.user.id)
    .maybeSingle();

  return (
    <PageShell>
      <h1 className="text-2xl font-semibold">Invitasjon til husholdning</h1>
      <p className="text-fg-muted">
        Du er invitert til{" "}
        <strong className="text-fg">{inv.household_name}</strong> som{" "}
        {roleLabel(inv.role)}.
      </p>
      <p className="text-xs text-fg-muted">
        Lenken utløper{" "}
        {new Date(inv.expires_at).toLocaleDateString("nb-NO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        .
      </p>

      <InvitationAcceptClient
        token={params.token}
        householdId={inv.household_id}
        alreadyMember={Boolean(existing)}
      />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-6 py-16 space-y-4">{children}</main>
  );
}
