-- Table privileges for the Supabase API roles.
--
-- Hosted Supabase projects hand these out ambiently: the project bootstrap sets
-- default privileges in `public`, so every table a migration creates is already
-- readable by `anon`, `authenticated` and `service_role`. The migrations in this
-- repo therefore never granted anything, and worked fine against the hosted
-- project.
--
-- A database built from these migrations alone -- `supabase start`, a fresh
-- self-hosted instance, a CI job -- does not get that. The API roles end up with
-- only `Dxtm` (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) and every request fails
-- with `42501: permission denied`. This migration closes that gap so the schema
-- stands up anywhere.
--
-- These are table-level grants, not row access. Row access is governed by RLS,
-- which is enabled with policies on all 13 tables in this schema; the grants are
-- the gate RLS sits behind, and removing RLS would be the security change, not
-- adding these. `service_role` additionally bypasses RLS by design -- it is for
-- admin scripts and server-side code, never the browser.
--
-- Privileges match what a hosted project grants, deliberately: local and
-- production should fail and succeed in the same places.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

-- Functions are deliberately NOT granted here. The earlier migrations follow a
-- tighter pattern -- `revoke all ... from public` then `grant execute` to just
-- the roles that need it, so `get_property_with_scores` reaches `authenticated`
-- but not `anon`. A blanket function grant would quietly undo that.

-- Tables added by later migrations inherit the same grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;
