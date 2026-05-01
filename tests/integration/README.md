# Integration tests

These specs run against a **real Supabase instance** (local CLI or a
dedicated test project). They verify the RLS layer, atomic acceptance
behaviour, and cascade-delete semantics — the things unit tests cannot
check because they depend on the database itself.

## Running

```bash
# 1. Start a local Supabase instance (CLI required)
supabase start

# 2. Apply the migrations + seed
supabase db reset

# 3. Set env vars so Vitest can talk to it
export TEST_SUPABASE_URL=http://localhost:54321
export TEST_SUPABASE_ANON_KEY=<anon-key-from-supabase-status>
export TEST_SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-status>

# 4. Run the suite
npm test -- tests/integration
```

## Currently skipped

Every spec in this folder is wrapped in `describe.skip(...)` until the
local Supabase prerequisite is wired up in CI. The skip is keyed on the
absence of `TEST_SUPABASE_URL`. Once that env var is set the suites
auto-enable. Each `it.skip` carries a comment naming the spec scenario
it implements so the skip can be flipped without re-deriving intent.
