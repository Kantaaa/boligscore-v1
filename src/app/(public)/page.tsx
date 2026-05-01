import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Public landing page (`/`).
 *
 * Spec: "Public landing page" — minimal funnel page (D8). Shows a
 * headline + supporting copy + two CTAs. No marketing scroll.
 *
 * Authenticated users still see the page; an extra "Gå til appen"
 * affordance appears so they can jump back into /app without going
 * through the login form again. We never auto-redirect from /.
 *
 * Tone: rolig, ryddig, trygg — Linear / Notion / Things 3 vibe.
 */
export default async function LandingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="text-base font-semibold tracking-tight text-fg">
          Boligscore
        </span>
        {isAuthed ? (
          <Link
            href="/app"
            className="inline-flex min-h-touch items-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-fg"
          >
            Gå til appen
          </Link>
        ) : (
          <Link
            href="/logg-inn"
            className="inline-flex min-h-touch items-center text-sm font-medium text-fg-muted hover:text-fg"
          >
            Logg inn
          </Link>
        )}
      </header>

      <section className="mt-16 flex flex-1 flex-col items-start justify-center gap-6 sm:mt-24">
        <h1 className="text-4xl font-semibold leading-tight text-fg sm:text-5xl">
          Score boliger sammen.
          <br />
          <span className="text-fg-muted">Bli enige raskere.</span>
        </h1>
        <p className="max-w-prose text-base text-fg-muted sm:text-lg">
          Boligscore er for deg som leter etter bolig sammen med noen.
          Vurder hver bolig på dine egne kriterier, sammenlign synspunkter,
          og se hvor dere er enige — og hvor dere må snakke.
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/registrer"
            className="inline-flex min-h-touch items-center rounded-md bg-primary px-6 text-base font-medium text-primary-fg shadow-sm hover:opacity-90"
          >
            Registrer
          </Link>
          <Link
            href="/logg-inn"
            className="inline-flex min-h-touch items-center rounded-md border border-border bg-surface px-6 text-base font-medium text-fg hover:bg-surface-raised"
          >
            Logg inn
          </Link>
        </div>

        <HeroIllustration />
      </section>

      <footer className="mt-16 border-t border-border pt-6 text-xs text-fg-muted">
        Vi spør ikke om mer enn nødvendig. Ingen reklame, ingen sporing.
      </footer>
    </main>
  );
}

/**
 * Subtle hero illustration. Pure SVG so it scales cleanly on any
 * viewport and respects the active theme via `currentColor`.
 *
 * Decorative — `aria-hidden` so screen readers skip it.
 */
function HeroIllustration() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 480 200"
      className="mt-8 w-full max-w-md text-primary/30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {/* Two stacked house silhouettes — partner-shopping motif. */}
      <path d="M40 160 L40 90 L110 50 L180 90 L180 160 Z" />
      <path d="M40 160 L180 160" />
      <path d="M85 160 L85 120 L135 120 L135 160" />
      <path d="M180 160 L180 100 L260 60 L340 100 L340 160 Z" strokeOpacity="0.7" />
      <path d="M260 160 L260 130 L300 130 L300 160" strokeOpacity="0.7" />
      <circle cx="400" cy="80" r="18" strokeOpacity="0.5" />
      <path d="M386 100 L414 100" strokeOpacity="0.5" />
    </svg>
  );
}
