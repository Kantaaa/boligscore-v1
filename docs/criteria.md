# Criteria — canonical list

> Spec source: `openspec/changes/weights/{proposal,design,specs/weights/spec.md}.md`.
>
> Migration: `supabase/migrations/20260501000007_weights_criteria_seed.sql`.

This document describes the **22 scored criteria** and **3 sections**
that Boligscore v2 uses across the `weights`, `scoring`, and
`comparison` capabilities. The list is seeded by the `weights`
migration and is **not user-editable** in MVP (design D4).

## Sections (3)

The three sections mirror the brief's "Bolig innvendig / Beliggenhet
& område / Helhet" grouping. A virtual fourth section, "Fakta", holds
three derived facts (pris/kvm, areal, alder) that are NOT scored —
those facts live on the `properties` table directly and are never
referenced by `criteria`.

| key | label | sort_order |
|---|---|---|
| `bolig_innvendig` | Bolig innvendig | 1 |
| `beliggenhet_omrade` | Beliggenhet & område | 2 |
| `helhet` | Helhet | 3 |

## Criteria (22)

Total: **9 + 7 + 6 = 22** scored criteria. All weights and scores
range 0..10 inclusive.

### Bolig innvendig (9)

| key | label (NO bokmål) | description |
|---|---|---|
| `kjokken` | Kjøkken | Standard og funksjonalitet på kjøkkenet (innredning, hvitevarer, plass). |
| `bad` | Bad | Kvalitet og tilstand på bad/dusj (flislegging, sanitær, ventilasjon). |
| `planlosning` | Planløsning | Hvor godt rommene henger sammen og om planløsningen er praktisk. |
| `lys_luft` | Lys og luft | Lysforhold, vindusflater og romfølelse — om boligen oppleves åpen og luftig. |
| `oppbevaring` | Oppbevaring | Skap, boder og generell lagringsplass. |
| `stue` | Stue | Stuens størrelse, lys og atmosfære. |
| `balkong_terrasse` | Balkong/terrasse | Kvalitet, størrelse og solforhold på uteplass(er). |
| `antall_soverom` | Antall soverom | Antall soverom — vurderes også opp mot total størrelse. |
| `antall_bad` | Antall bad | Antall bad/WC — vurderes også opp mot antall beboere. |

### Beliggenhet & område (7)

| key | label (NO bokmål) | description |
|---|---|---|
| `omradeinntrykk` | Områdeinntrykk | Inntrykk av umiddelbart nærområde, gaten og utsikt. |
| `nabolagsfolelse` | Nabolagsfølelse | Atmosfære, trygghet og fasiliteter i nabolaget. |
| `transport` | Transport | Nærhet og frekvens for buss, bane, tog og hovedveier. |
| `skoler` | Skoler & barnehager | Tilgjengelighet og kvalitet på skoler og barnehager. |
| `beliggenhet_makro` | Beliggenhet (makro) | Den overordnede plasseringen — bydel, kommune, region. |
| `parkering` | Parkering | Tilgjengelighet og type parkering (garasje, antall plasser, gateparkering). |
| `stoy` | Støynivå | Hvor stille det er — trafikkstøy, naboer, byggestøy. |

### Helhet (6)

| key | label (NO bokmål) | description |
|---|---|---|
| `visningsinntrykk` | Visningsinntrykk | Subjektivt helhetsinntrykk fra visningen. |
| `potensial` | Potensial | Muligheter for utbygging, modernisering eller verdivekst. |
| `tilstand` | Tilstand | Boligens generelle vedlikeholdsstandard og byggteknisk tilstand. |
| `hage` | Hage/uteareal | Tilstedeværelse, størrelse og kvalitet på hage eller felles uteareal. |
| `utleiedel` | Utleiedel | Om boligen har en separat, godkjent utleiedel som kan gi inntekt. |
| `solforhold` | Solforhold | Hvor mye sol boligen får i løpet av dagen og året. |

## Provenance

The 13 criteria explicitly named in the brief are present verbatim:

- Brief Bolig innvendig (7): `kjokken`, `bad`, `planlosning`,
  `lys_luft`, `oppbevaring`, `stue`, `balkong_terrasse`.
- Brief Beliggenhet & område (4): `omradeinntrykk`,
  `nabolagsfolelse`, `transport`, `skoler`.
- Brief Helhet (2): `visningsinntrykk`, `potensial`.

The remaining 9 are derived as follows. Tasks 1.4 says: "Plus 9 more
from v1's `ScoringCriterion` enum that match the brief". The v1 enum
in `legacy/types.ts` listed:

```
PRICE_PER_SQM, AREA_SIZE, CONDITION, LOCATION, PARKING, GARDEN,
RENTAL_UNIT, AGE, BEDROOMS, BATHROOMS,
KITCHEN_QUALITY, LIVING_ROOM_QUALITY, STORAGE_QUALITY,
FLOOR_PLAN_QUALITY, BALCONY_TERRACE_QUALITY, LIGHT_AND_AIR_QUALITY,
AREA_IMPRESSION, NEIGHBORHOOD_IMPRESSION, PUBLIC_TRANSPORT_ACCESS,
SCHOOLS_PROXIMITY, VIEWING_IMPRESSION, POTENTIAL
```

Crossing off the 13 already in the brief AND the 3 "Fakta" facts
(`PRICE_PER_SQM`, `AREA_SIZE`, `AGE`) leaves 6 v1-enum candidates:
`CONDITION`, `LOCATION`, `PARKING`, `GARDEN`, `RENTAL_UNIT`,
`BEDROOMS`, `BATHROOMS`. (That's 7.)

Mapping into v2 keys:

- `tilstand` ← `CONDITION`
- `beliggenhet_makro` ← `LOCATION`
- `parkering` ← `PARKING`
- `hage` ← `GARDEN`
- `utleiedel` ← `RENTAL_UNIT`
- `antall_soverom` ← `BEDROOMS`
- `antall_bad` ← `BATHROOMS`

That covers 7 of the 9 needed. Two MVP-additions complete the set:

- `stoy` (støynivå) — common Norwegian housing concern not in v1 but
  frequently asked about during boligvisninger.
- `solforhold` — orthogonal to `lys_luft` (interior brightness): how
  many hours of direct sun the property gets, which matters in
  Norwegian winters.

## Why these aren't user-editable (D4)

Making criteria editable would require localization, validation, and
migration logic for the score history when criteria change. None of
that is needed for MVP. If the criteria list ever needs to change, we
ship a new migration.

## Consumers

This list is the canonical source for:

- **`weights`** — seeds 22 rows into `criteria` from the migration
  above (`20260501000007_weights_criteria_seed.sql`).
- **`scoring`** — uses `getCriteria()` to render the chip rows on
  Min vurdering. The grouping by `section_id` matches the 3 sections
  here. See `docs/architecture/scoring.md`.
- **`comparison`** — reads the same list to align the felles/din
  columns. (Future capability — not yet implemented.)

The "Fakta" virtual section (Pris/kvm, Størrelse, Alder) is
deliberately NOT in the `criteria` table — those values are computed
on the fly from `properties.{price, bra, year_built}` and rendered
read-only by `<FaktaSection>` in the scoring UI (D6, D10).
