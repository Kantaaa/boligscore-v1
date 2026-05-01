"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sign the current user out and redirect to `/`.
 *
 * Spec: "Logout" — D7 mandates this is the ONLY logout entry point
 * (lives on `/app/meg`). The action does not return — `redirect()`
 * throws Next's redirect signal so the form post resolves with a 303.
 */
export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
