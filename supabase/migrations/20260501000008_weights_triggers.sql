-- weights capability — seeding triggers.
--
-- Tasks (openspec/changes/weights/tasks.md):
--   2.3 Trigger on `households` AFTER INSERT: insert 22 rows into
--       `household_weights` for the new household with `weight = 5`.
--   2.4 Trigger on `household_members` AFTER INSERT: insert 22 rows
--       into `user_weights` for the new (user × household) with
--       `weight = 5`.
--
-- Also: one-time backfill for households / household_members rows
-- that were created before these triggers were defined (e.g. local
-- dev databases that ran the migrations out of order with the
-- properties stub). Because both inserts are guarded with
-- ON CONFLICT DO NOTHING, the backfill is safe to replay.
--
-- Design D3 (design.md): triggers are atomic with the row insert and
-- impossible to forget. Application-code seeding is bypassable by
-- direct DB writes (e.g. a future bulk import script), which would
-- create households missing weights. Triggers are the single source
-- of truth.

-- household_weights seeder ----------------------------------------------------

create or replace function public.seed_household_weights()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.household_weights (household_id, criterion_id, weight)
    select new.id, c.id, 5
    from public.criteria c
    on conflict (household_id, criterion_id) do nothing;
    return new;
end;
$$;

comment on function public.seed_household_weights() is
    'Seeds 22 household_weights rows (one per criterion, weight=5) for a newly-inserted household. Idempotent via ON CONFLICT.';

drop trigger if exists households_seed_weights on public.households;
create trigger households_seed_weights
    after insert on public.households
    for each row execute function public.seed_household_weights();

-- user_weights seeder ---------------------------------------------------------

create or replace function public.seed_user_weights()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_weights (household_id, user_id, criterion_id, weight)
    select new.household_id, new.user_id, c.id, 5
    from public.criteria c
    on conflict (household_id, user_id, criterion_id) do nothing;
    return new;
end;
$$;

comment on function public.seed_user_weights() is
    'Seeds 22 user_weights rows (one per criterion, weight=5) when a member joins a household. Idempotent via ON CONFLICT.';

drop trigger if exists household_members_seed_weights on public.household_members;
create trigger household_members_seed_weights
    after insert on public.household_members
    for each row execute function public.seed_user_weights();

-- One-time backfill -----------------------------------------------------------
--
-- Existing households created before the trigger was added need their
-- 22 felles weight rows. Same for existing members. Both inserts use
-- ON CONFLICT DO NOTHING so this is safe to replay.

insert into public.household_weights (household_id, criterion_id, weight)
select h.id, c.id, 5
from public.households h
cross join public.criteria c
on conflict (household_id, criterion_id) do nothing;

insert into public.user_weights (household_id, user_id, criterion_id, weight)
select hm.household_id, hm.user_id, c.id, 5
from public.household_members hm
cross join public.criteria c
on conflict (household_id, user_id, criterion_id) do nothing;
