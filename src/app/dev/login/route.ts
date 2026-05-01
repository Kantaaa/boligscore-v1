import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { resolveNextOrDefault } from "@/lib/auth/redirects";
import { requirePublicSupabaseConfig } from "@/lib/env";

/**
 * Dev test bypass route — `/dev/login`.
 *
 * Spec: "Dev test bypass route" (D6). Signs in `alice@test.local` or
 * `bob@test.local` (password `test1234`) with one HTTP request and
 * redirects to `/app` (or `?next=`). Used by Playwright e2e tests to
 * skip the password form.
 *
 * Hard-gated by TWO env vars (paranoia — this is a backdoor):
 *   - NEXT_PUBLIC_DEV_LOGIN_ENABLED === "1"  (build-time signal)
 *   - DEV_LOGIN_FORCE === "1"                (run-time confirmation)
 * Both must be set; otherwise the route returns 404 so the URL is
 * indistinguishable from any other unknown path.
 *
 * The build-time guard in next.config.mjs aborts a production build
 * when both gates are set in a `VERCEL_ENV=production` environment, so
 * the route can never ship to prod by accident.
 *
 * The route is intentionally a Route Handler (not a page) so it never
 * renders UI and so a single GET completes the round-trip.
 */
export const dynamic = "force-dynamic";

type DevUser = "alice" | "bob";

const DEV_USERS: Record<DevUser, { email: string; password: string }> = {
  alice: { email: "alice@test.local", password: "test1234" },
  bob: { email: "bob@test.local", password: "test1234" },
};

function isDevLoginEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED === "1" &&
    process.env.DEV_LOGIN_FORCE === "1"
  );
}

export async function GET(request: NextRequest) {
  if (!isDevLoginEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = request.nextUrl;
  const asParam = (url.searchParams.get("as") ?? "alice").toLowerCase();
  const user =
    asParam === "alice" || asParam === "bob"
      ? DEV_USERS[asParam as DevUser]
      : DEV_USERS.alice;

  const next = url.searchParams.get("next");
  const target = resolveNextOrDefault(next, "/app");
  const redirectUrl = new URL(target, url);

  // Build a redirect response up front so we can attach session cookies
  // to it via Supabase's cookie adapter.
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  const { url: supabaseUrl, anonKey } = requirePublicSupabaseConfig();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) {
    return new NextResponse(
      `dev-login failed for ${user.email}: ${error.message}\n` +
        "Did you run `node scripts/seed-dev-users.mjs`?",
      { status: 500 },
    );
  }

  return response;
}
