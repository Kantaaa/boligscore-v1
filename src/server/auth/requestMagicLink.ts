"use server";

import { resolveNextOrDefault } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateEmail } from "@/lib/auth/validation";
import type { ActionResult } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

export interface MagicLinkArgs {
  email: string;
  /** Optional ?next= target. Validated, defaults to /app. */
  next?: string | null;
  /**
   * If true, allow Supabase to create a new user when the email is
   * unknown. Set on /registrer; cleared on /logg-inn.
   */
  shouldCreateUser?: boolean;
}

/**
 * Send a magic-link sign-in email via `supabase.auth.signInWithOtp`.
 *
 * Spec: "Magic link authentication (alternate)". Returns ok with no
 * payload when the request is accepted; the page renders the
 * "Sjekk e-posten din for å logge inn." notice.
 *
 * In dev with the local Supabase CLI the email is captured by Mailpit
 * at http://localhost:54324 — no real inbox required.
 */
export async function requestMagicLink({
  email,
  next,
  shouldCreateUser = false,
}: MagicLinkArgs): Promise<ActionResult<void>> {
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return err(emailCheck.error);

  const resolved = resolveNextOrDefault(next, "/app");
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || "";

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser,
      emailRedirectTo: origin ? `${origin}${resolved}` : undefined,
    },
  });

  if (error) {
    return err(error.message);
  }

  return ok(undefined);
}
