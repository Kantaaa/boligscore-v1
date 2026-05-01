import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { HusstandClient } from "@/components/households/HusstandClient";
import { ActiveHouseholdSelector } from "@/components/households/ActiveHouseholdSelector";
import { getHousehold } from "@/server/households/getHousehold";
import { listInvitations } from "@/server/households/listInvitations";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Husstand page (`/app/husstand`).
 *
 * Server-renders the active household, its members, and pending
 * invitations. Interactive bits (rename, change role, remove, leave,
 * delete, generate invitation, copy link) live in `<HusstandClient>`.
 *
 * Active household resolution: server reads the cookie-bound user, but
 * the active household id lives in localStorage (design D5). The
 * server-side fallback is "most recently accessed" via the same
 * ordering used by listMyHouseholds. The client may swap the active
 * household via the switcher, which calls `router.refresh()` so this
 * page re-runs with the new id.
 */
export default async function HusstandPage({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  const memberships = await listMyHouseholds();
  if (!memberships.ok) {
    return (
      <PageShell>
        <p className="text-sm text-status-bud-inne">{memberships.error}</p>
      </PageShell>
    );
  }
  if (memberships.data.length === 0) {
    redirect("/app/onboarding");
  }

  // Pick the active household: query param wins (so the client can
  // pass localStorage state via a refresh), else the most recently
  // accessed membership.
  const activeId = searchParams?.id ?? memberships.data[0].id;
  const active = memberships.data.find((m) => m.id === activeId)
    ?? memberships.data[0];

  const [data, invitations] = await Promise.all([
    getHousehold(active.id),
    listInvitations(active.id),
  ]);

  if (!data.ok) {
    return (
      <PageShell>
        <p className="text-sm text-status-bud-inne">{data.error}</p>
      </PageShell>
    );
  }

  const supabase = createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const currentUserId = u.user?.id ?? "";

  // Origin for the copy-link CTA. We prefer NEXT_PUBLIC_APP_ORIGIN if
  // set; otherwise fall back to the request host so dev/staging both
  // produce sensible links.
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    (host ? `${proto}://${host}` : "");

  return (
    <PageShell>
      {/* Sync the URL param with the localStorage active household so
          server and client agree on which one is shown. */}
      <ActiveHouseholdSelector activeIdInUrl={searchParams?.id ?? null} />

      <HusstandClient
        data={data.data}
        invitations={invitations.ok ? invitations.data : []}
        currentUserId={currentUserId}
        myRole={active.role}
        origin={origin}
      />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="husstand-heading" className="space-y-6">
      <h1 id="husstand-heading" className="text-2xl font-semibold">
        Husstand
      </h1>
      {children}
    </section>
  );
}
