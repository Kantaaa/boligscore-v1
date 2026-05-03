-- properties — extend with budget + energi + finnkode columns.
--
-- Owned by the `properties-finn-fields` capability. Adds eight nullable
-- columns sourced from FINN listings (or filled in manually): three
-- cost numbers, the plot size, the floor label, the energy rating
-- (letter + color), and the FINN listing id.
--
-- Idempotent so the migration is safe to re-run on environments that
-- already pulled the columns in via an earlier branch.
--
-- Spec: openspec/changes/properties-finn-fields/specs/properties-finn-fields/spec.md
-- Design: openspec/changes/properties-finn-fields/design.md (D1, D2, D3, D4)

-- 1. Columns ------------------------------------------------------------------

alter table public.properties
    add column if not exists felleskostnader integer,
    add column if not exists omkostninger integer,
    add column if not exists fellesgjeld integer,
    add column if not exists tomteareal integer,
    add column if not exists etasje text,
    add column if not exists energimerke_letter char(1),
    add column if not exists energimerke_color text,
    add column if not exists finnkode integer;

comment on column public.properties.felleskostnader is
    'Felleskostnader per måned (NOK). Nullable.';
comment on column public.properties.omkostninger is
    'Omkostninger ved kjøp (NOK, engang). Nullable.';
comment on column public.properties.fellesgjeld is
    'Andel fellesgjeld (NOK). Nullable.';
comment on column public.properties.tomteareal is
    'Tomteareal (m²). Nullable.';
comment on column public.properties.etasje is
    'Etasje som tekst — FINN bruker varianter ("4. etasje", "U. etasje", '
    '"1. av 5"). Maks 20 tegn. Nullable.';
comment on column public.properties.energimerke_letter is
    'Energimerke A–G. Nullable.';
comment on column public.properties.energimerke_color is
    'Energimerke fargekode (dark_green/light_green/yellow/orange/red). Nullable.';
comment on column public.properties.finnkode is
    'FINN-annonsens id. Tillater dedupe per husholdning via partial unique index. Nullable.';

-- 2. CHECK constraints --------------------------------------------------------
--
-- Wrapped in DO-blocks so the migration is idempotent. Postgres < 16
-- has no `add constraint if not exists` so we look it up in
-- pg_constraint by name first.

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'properties_energimerke_letter_check'
          and conrelid = 'public.properties'::regclass
    ) then
        alter table public.properties
            add constraint properties_energimerke_letter_check
            check (energimerke_letter is null
                   or energimerke_letter in ('A','B','C','D','E','F','G'));
    end if;
end$$;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'properties_energimerke_color_check'
          and conrelid = 'public.properties'::regclass
    ) then
        alter table public.properties
            add constraint properties_energimerke_color_check
            check (energimerke_color is null
                   or energimerke_color in (
                       'dark_green', 'light_green', 'yellow', 'orange', 'red'
                   ));
    end if;
end$$;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'properties_etasje_length_check'
          and conrelid = 'public.properties'::regclass
    ) then
        alter table public.properties
            add constraint properties_etasje_length_check
            check (etasje is null or length(etasje) <= 20);
    end if;
end$$;

-- 3. Partial unique index on (household_id, finnkode) -------------------------
--
-- Per-household uniqueness so two unrelated households can score the
-- same listing, but the same household can't add it twice. Partial
-- WHERE excludes nulls so manually-entered properties (no finnkode)
-- can coexist freely.

create unique index if not exists properties_household_finnkode_uniq
    on public.properties (household_id, finnkode)
    where finnkode is not null;
