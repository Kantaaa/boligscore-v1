import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { safeNextParam } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { next?: string | string[] };
}

/**
 * Login page (`/logg-inn`). Spec: "Email/password login" + magic-link
 * variant (D1).
 *
 * If the visitor is already authenticated we forward them to the
 * post-auth destination immediately so refresh / back-button pairs
 * don't strand them on this page.
 */
export default async function LoggInnPage({ searchParams }: PageProps) {
  const rawNext =
    typeof searchParams.next === "string" ? searchParams.next : null;
  const safeNext = safeNextParam(rawNext);

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
          <h1 className="text-3xl font-semibold text-fg">Logg inn</h1>
          <p className="text-fg-muted">
            Velkommen tilbake.
          </p>
        </div>

        <LoginForm next={safeNext} />
      </div>
    </main>
  );
}
