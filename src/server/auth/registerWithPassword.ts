"use server";

import { resolveNextOrDefault } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateEmail, validatePassword } from "@/lib/auth/validation";
import type { ActionResult } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

export interface RegisterArgs {
  email: string;
  password: string;
  /** Optional ?next= target. Validated, defaults to /app/onboarding. */
  next?: string | null;
}

/**
 * Register a new account with email + password.
 *
 * Spec: "Email/password registration".
 *
 * Behaviour:
 *   - Pre-validate email + password (cheap, gives Norwegian errors).
 *   - Call `supabase.auth.signUp` with `emailRedirectTo` carrying the
 *     resolved `next` so any confirmation-email link returns the user
 *     to the right place.
 *   - On success returns `{ next, requiresConfirmation }`. The page
 *     decides whether to redirect (dev) or show "kontroller e-post"
 *     (prod, when EMAIL_CONFIRM_REQUIRED is true and the session is
 *     not yet established).
 */
export async function registerWithPassword({
  email,
  password,
  next,
}: RegisterArgs): Promise<
  ActionResult<{ next: string; requiresConfirmation: boolean }>
> {
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return err(emailCheck.error);
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return err(passwordCheck.error);

  // Default fallback is /app/onboarding — first-time signups always go
  // through onboarding to create their household.
  const resolved = resolveNextOrDefault(next, "/app/onboarding");
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || "";

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: origin ? `${origin}${resolved}` : undefined,
    },
  });

  if (error) {
    // Friendly Norwegian copy for the most common cases. Anything else
    // falls through with the raw provider message — better than a
    // generic "noe gikk galt" because it tells the user something actionable.
    const lower = error.message.toLowerCase();
    if (lower.includes("already") || lower.includes("registered")) {
      return err(
        "En konto med denne e-posten finnes allerede. Logg inn i stedet.",
      );
    }
    if (lower.includes("password")) {
      return err("Passordet er for svakt. Bruk minst 8 tegn.");
    }
    if (lower.includes("invalid") && lower.includes("email")) {
      return err("Ugyldig e-postadresse");
    }
    return err(error.message);
  }

  // When EMAIL_CONFIRM is enabled, signUp returns a user but no session
  // — the user must click the confirmation link first. We surface this
  // so the page can render the "kontroller e-post" message instead of
  // redirecting into /app.
  const requiresConfirmation = !data.session;

  return ok({ next: resolved, requiresConfirmation });
}
