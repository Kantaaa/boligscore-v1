-- weights capability — criteria seed data.
--
-- Tasks (openspec/changes/weights/tasks.md):
--   1.3 Seed three sections.
--   1.4 Seed 22 criteria with the keys/labels from the design brief.
--
-- The `criteria` and `criterion_sections` tables themselves were created
-- as STUBS in `20260501000004_properties_dependent_stubs.sql` so the
-- properties list function could compile against empty references. This
-- migration POPULATES them with the canonical 22 criteria + 3 sections.
--
-- All inserts are idempotent (`ON CONFLICT (key) DO NOTHING`) so the
-- migration can be replayed against an environment where prior partial
-- runs left some rows behind.
--
-- Final list (canonical — see docs/criteria.md for full descriptions):
--   Bolig innvendig (9):
--     kjokken, bad, planlosning, lys_luft, oppbevaring, stue,
--     balkong_terrasse, antall_soverom, antall_bad
--   Beliggenhet & område (7):
--     omradeinntrykk, nabolagsfolelse, transport, skoler,
--     beliggenhet_makro, parkering, stoy
--   Helhet (6):
--     visningsinntrykk, potensial, tilstand, hage, utleiedel,
--     solforhold
--
-- The 13 explicit criteria from the brief are present verbatim. The
-- remaining 9 are sourced from v1's `ScoringCriterion` enum (legacy/
-- types.ts) — minus the 3 "Fakta" facts (pris/kvm, areal, alder) which
-- the spec explicitly excludes from scored criteria — plus two MVP
-- additions (`stoy`, `solforhold`) so the section counts add up to 22.
-- See docs/criteria.md for the rationale.

-- Sections --------------------------------------------------------------------

insert into public.criterion_sections (key, label, description, sort_order)
values
    (
        'bolig_innvendig',
        'Bolig innvendig',
        'Hvordan boligen oppleves innvendig — kvalitet, planløsning og romopplevelse.',
        1
    ),
    (
        'beliggenhet_omrade',
        'Beliggenhet & område',
        'Hvor boligen ligger og hvordan området rundt oppleves.',
        2
    ),
    (
        'helhet',
        'Helhet',
        'Helhetsinntrykk og overordnede egenskaper ved boligen.',
        3
    )
on conflict (key) do nothing;

-- Criteria --------------------------------------------------------------------
--
-- We resolve section_id by sub-selecting on `key` so the inserts are
-- idempotent and the migration is independent of generated UUIDs.

insert into public.criteria (key, section_id, label, description, sort_order)
select
    c.key,
    s.id,
    c.label,
    c.description,
    c.sort_order
from (values
    -- Bolig innvendig --------------------------------------------------
    ('kjokken',          'bolig_innvendig',    'Kjøkken',
        'Standard og funksjonalitet på kjøkkenet (innredning, hvitevarer, plass).',
        10),
    ('bad',              'bolig_innvendig',    'Bad',
        'Kvalitet og tilstand på bad/dusj (flislegging, sanitær, ventilasjon).',
        20),
    ('planlosning',      'bolig_innvendig',    'Planløsning',
        'Hvor godt rommene henger sammen og om planløsningen er praktisk.',
        30),
    ('lys_luft',         'bolig_innvendig',    'Lys og luft',
        'Lysforhold, vindusflater og romfølelse — om boligen oppleves åpen og luftig.',
        40),
    ('oppbevaring',      'bolig_innvendig',    'Oppbevaring',
        'Skap, boder og generell lagringsplass.',
        50),
    ('stue',             'bolig_innvendig',    'Stue',
        'Stuens størrelse, lys og atmosfære.',
        60),
    ('balkong_terrasse', 'bolig_innvendig',    'Balkong/terrasse',
        'Kvalitet, størrelse og solforhold på uteplass(er).',
        70),
    ('antall_soverom',   'bolig_innvendig',    'Antall soverom',
        'Antall soverom — vurderes også opp mot total størrelse.',
        80),
    ('antall_bad',       'bolig_innvendig',    'Antall bad',
        'Antall bad/WC — vurderes også opp mot antall beboere.',
        90),

    -- Beliggenhet & område ---------------------------------------------
    ('omradeinntrykk',   'beliggenhet_omrade', 'Områdeinntrykk',
        'Inntrykk av umiddelbart nærområde, gaten og utsikt.',
        100),
    ('nabolagsfolelse',  'beliggenhet_omrade', 'Nabolagsfølelse',
        'Atmosfære, trygghet og fasiliteter i nabolaget.',
        110),
    ('transport',        'beliggenhet_omrade', 'Transport',
        'Nærhet og frekvens for buss, bane, tog og hovedveier.',
        120),
    ('skoler',           'beliggenhet_omrade', 'Skoler & barnehager',
        'Tilgjengelighet og kvalitet på skoler og barnehager.',
        130),
    ('beliggenhet_makro','beliggenhet_omrade', 'Beliggenhet (makro)',
        'Den overordnede plasseringen — bydel, kommune, region.',
        140),
    ('parkering',        'beliggenhet_omrade', 'Parkering',
        'Tilgjengelighet og type parkering (garasje, antall plasser, gateparkering).',
        150),
    ('stoy',             'beliggenhet_omrade', 'Støynivå',
        'Hvor stille det er — trafikkstøy, naboer, byggestøy.',
        160),

    -- Helhet ------------------------------------------------------------
    ('visningsinntrykk', 'helhet',             'Visningsinntrykk',
        'Subjektivt helhetsinntrykk fra visningen.',
        200),
    ('potensial',        'helhet',             'Potensial',
        'Muligheter for utbygging, modernisering eller verdivekst.',
        210),
    ('tilstand',         'helhet',             'Tilstand',
        'Boligens generelle vedlikeholdsstandard og byggteknisk tilstand.',
        220),
    ('hage',             'helhet',             'Hage/uteareal',
        'Tilstedeværelse, størrelse og kvalitet på hage eller felles uteareal.',
        230),
    ('utleiedel',        'helhet',             'Utleiedel',
        'Om boligen har en separat, godkjent utleiedel som kan gi inntekt.',
        240),
    ('solforhold',       'helhet',             'Solforhold',
        'Hvor mye sol boligen får i løpet av dagen og året.',
        250)
) as c(key, section_key, label, description, sort_order)
join public.criterion_sections s on s.key = c.section_key
on conflict (key) do nothing;

-- Sanity check: assert exactly 22 criteria + 3 sections after seeding.
do $$
declare
    v_section_count int;
    v_criteria_count int;
begin
    select count(*) into v_section_count from public.criterion_sections;
    select count(*) into v_criteria_count from public.criteria;
    if v_section_count <> 3 then
        raise exception 'Expected 3 criterion_sections, found %', v_section_count;
    end if;
    if v_criteria_count <> 22 then
        raise exception 'Expected 22 criteria, found %', v_criteria_count;
    end if;
end$$;
