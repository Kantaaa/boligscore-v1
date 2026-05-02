# Supabase migrations & local dev

This folder contains the SQL migrations and seed data for Boligscore v2.

## Files

```
supabase/
  migrations/
    20260501000001_households.sql       # tables: households, household_members, household_invitations
    20260501000002_households_rls.sql   # has_household_role(), get_invitation_by_token(), policies
  seed.sql                              # alice@test.local + bob@test.local + shared household
  README.md                             # this file
```

Migrations are intentionally written so they can be replayed safely
(`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY
IF EXISTS`).

## Applying migrations to a remote Supabase project

If you only have a hosted Supabase project (no CLI yet):

1. Open the project in the Supabase dashboard.
2. Go to **SQL Editor** → **New query**.
3. Paste each migration file in order (numbered prefix), run it.
4. (Optional) Run `seed.sql` if you want the test users in this database.
   Note: the `auth.users` insert in `seed.sql` may fail on hosted Supabase
   because the auth schema rejects external inserts. If so, create the
   users via the Supabase dashboard (Authentication → Users → Add user)
   with the same UUIDs and emails, then run only the `households` /
   `household_members` portion of `seed.sql`.

## Applying migrations with the Supabase CLI

Once `supabase` CLI is available locally:

```bash
# from repo root
supabase init                # one-time, creates supabase/config.toml
supabase start               # boots local Postgres + Mailpit
supabase db push             # applies migrations in order
supabase db reset            # re-applies migrations + seed (destroys local data)
```

For a remote project:

```bash
supabase link --project-ref <ref>
supabase db push
```

## RLS model summary

- Every household-scoped table has two policies: a **read** policy gated by
  membership, and a **write** policy gated by membership AND role in
  (`owner`, `member`). Viewers cannot write.
- The `public.has_household_role(hid uuid, roles text[])` SQL helper
  encapsulates the membership-and-role check so capability authors can
  write one-line policy expressions.
- The `public.get_invitation_by_token(p_token uuid)` SECURITY DEFINER
  function lets unauthenticated callers (the `/invitasjon/[token]`
  acceptance page) read the small public face of an invitation row
  before the user signs in.

See `docs/architecture/households.md` for more detail.
