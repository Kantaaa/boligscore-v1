#!/usr/bin/env node
/**
 * Seed dev test users on the hosted Supabase project.
 *
 * Creates `alice@test.local` and `bob@test.local` (both with password
 * `test1234`) via the Supabase admin API. Idempotent — existing users
 * are left in place.
 *
 * Why this script exists: `supabase/seed.sql` runs only against the
 * local Supabase CLI stack. The hosted project does not pick up that
 * seed file, so we provision the same fixture users via the admin API.
 *
 * Usage:
 *   node scripts/seed-dev-users.mjs
 *
 * Requires `.env.local` (or the parent shell) to provide:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Best-effort .env.local loader so the script works without `dotenv`.
function loadDotEnvLocal() {
  try {
    const path = resolve(__dirname, "..", ".env.local");
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore — script will fall back to whatever is already in process.env.
  }
}

loadDotEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[seed-dev-users] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "alice@test.local", password: "test1234" },
  { email: "bob@test.local", password: "test1234" },
];

async function userExists(email) {
  // listUsers is paginated; default page covers our needs (1 page = 50 users).
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw error;
  return data.users.some((u) => u.email === email);
}

async function ensureUser({ email, password }) {
  if (await userExists(email)) {
    console.log(`[seed-dev-users] ${email} already exists — skipping`);
    return;
  }
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error(`[seed-dev-users] failed to create ${email}: ${error.message}`);
    throw error;
  }
  console.log(`[seed-dev-users] created ${email}`);
}

async function main() {
  for (const user of USERS) {
    await ensureUser(user);
  }
  console.log("[seed-dev-users] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
