import { SignOutButton } from "@/components/auth/SignOutButton";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Meg page. Per design D7, this is the ONLY place that exposes a
 * sign-out action — no logout in the header, the bottom nav, or the
 * household switcher.
 *
 * The page is intentionally light for MVP. Profile editing, account
 * deletion, etc. are out of scope for `auth-onboarding` and will be
 * added by later capabilities.
 */
export default async function MegPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section aria-labelledby="meg-heading" className="space-y-6">
      <h1 id="meg-heading" className="text-2xl font-semibold">
        Meg
      </h1>

      {user?.email ? (
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <p className="text-sm text-fg-muted">Logget inn som</p>
          <p className="text-base font-medium text-fg">{user.email}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Tema</h2>
        <p className="text-sm text-fg-muted">
          Velg om appen skal vises i lyst eller mørkt tema.
        </p>
        <ThemeToggle />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">App</h2>
        <p className="text-sm text-fg-muted">
          Installer Boligscore som app på enheten din.
        </p>
        <InstallAppButton />
      </div>

      <div className="space-y-2 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Konto</h2>
        <p className="text-sm text-fg-muted">
          Når du logger ut blir du sendt tilbake til forsiden.
        </p>
        <SignOutButton />
      </div>
    </section>
  );
}
