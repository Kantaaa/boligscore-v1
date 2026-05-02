"use server";

import { resolveNextOrDefault } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateEmail } from "@/lib/auth/validation";
import type { ActionResult } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

export interface LoginArgs {
  email: string;
  password: string;
  /** Optional ?next= target. Validated, defaults to /app. */
  next?: string | null;
}

/**
 * Sign an existing user in with email + password.
 *
 * Spec: "Email/password login".
 *
 * Errors map to Norwegian copy:
 *   - invalid credentials → "Feil e-post eller passord."
 *   - unconfirmed email   → "Kontroller e-post — vi har sendt en
 *                            bekreftelseslenke" (prod only).
 *   - any other           → raw provider message (still NB-localised
 *                            by Supabase when configured).
 */
export async function loginWithPassword({
  email,
  password,
  next,
}: LoginArgs): Promise<ActionResult<{ next: string }>> {
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return err(emailCheck.error);
  if (!password) return err("Skriv inn passordet ditt");

  const resolved = resolveNextOrDefault(next, "/app");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("invalid") && lower.includes("credential")) {
      return err("Feil e-post eller passord.");
    }
    if (lower.includes("invalid login")) {
      return err("Feil e-post eller passord.");
    }
    if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
      return err("Kontroller e-post — vi har sendt en bekreftelseslenke");
    }
    return err(error.message);
  }

  return ok({ next: resolved });
}
