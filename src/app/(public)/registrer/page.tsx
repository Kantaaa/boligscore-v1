import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { safeNextParam } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { next?: string | string[] };
}

/**
 * Registration page (`/registrer`). Spec: "Email/password registration"
 * + "Magic link authentication (alternate)".
 *
 * If the user is already signed in we send them straight to the
 * post-auth destination (next or /app). The middleware doesn't gate
 * /registrer so we do the redirect here.
 */
export default async function RegistrerPage({ searchParams }: PageProps) {
  const rawNext =
    typeof searchParams.next === "string" ? searchParams.next : null;
  const safeNext = safeNextParam(rawNext);

  // If the visitor is already authenticated, skip the form. Use the
  // sanitised next, falling back to /app (NOT /app/onboarding — they
  // already have an account; onboarding is a first-run concept).
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(safeNext ?? "/app");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex min-h-touch items-center text-sm font-medium text-fg-muted hover:text-fg"
        >
          ← Tilbake
        </Link>
      </header>

      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-fg">Opprett konto</h1>
          <p className="text-fg-muted">
            Det tar under et minutt. Ingen kortinformasjon, ingen reklame.
          </p>
        </div>

        <RegisterForm next={safeNext} />
      </div>
    </main>
  );
}
