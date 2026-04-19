# Boligscore v2 — Plan

> Status: arbeidsdokument. Alle avgjørelser som er landet er markert ✅. Åpne punkter er markert 🟡.
> Plasseres i `v2/` i eksisterende repo. v1-koden (`App.tsx`, `components/`, m.fl.) lever videre i rot inntil v2 er klar til å overta.

---

## 1. Mål og ikke-mål

### Mål
- Ny, ren versjon av Boligscore bygget for husholdninger (2+ brukere) som sammen vurderer boliger.
- Uavhengige karakterer per bruker + **felles-karakter** som kan overstyre for totalen.
- Delt eiendomsliste i husholdningen, men personlig scoring-opplevelse.
- Moderne stack, god UX på mobil (PWA), enkelt å drifte alene.

### Ikke-mål (v2)
- Offline-støtte.
- Multi-tenant/organisasjoner utover én husholdning per bruker (for nå).
- Avansert AI-analyse (kan komme som v2.x).
- Maks-grense for antall husholdningsmedlemmer.

---

## 2. Stack ✅

| Lag | Valg |
|-----|------|
| Frontend | **Next.js 15** (App Router, React Server Components, Server Actions) |
| Språk | TypeScript (strict) |
| Styling | **Tailwind v4** + **shadcn/ui** |
| DB/Auth | **Supabase** (Postgres + Auth + RLS + Storage) |
| Hosting | **Vercel** |
| Keep-alive | **Vercel Cron** pinger Supabase så databasen ikke pauser (free tier) |
| PWA | `next-pwa` eller tilsvarende, **ingen offline** (kun installerbarhet + ikoner + app-feel) |
| Design-input | Stitch MCP (ideering + komponentskisser) |

### Hvorfor
- **Next.js 15 + Server Actions**: færre API-endepunkter, raskere iterasjon, god støtte i shadcn.
- **Supabase RLS**: sikkerhet følger data, slipper å dobbelt-validere i appen.
- **Vercel Cron**: gratis og trivielt å sette opp; Supabase free tier pauser etter 7 dager uten trafikk.

---

## 3. Datamodell ✅

Alle tabeller har `id uuid pk`, `created_at timestamptz`, `updated_at timestamptz` (via trigger) med mindre annet er spesifisert.

### 3.1 `households`
| Kolonne | Type | Notat |
|---|---|---|
| `id` | uuid | pk |
| `name` | text | f.eks. "Ola & Kari" |
| `created_by` | uuid | fk → auth.users |
| `auto_criteria_thresholds` | jsonb | husholdnings-innstillinger for auto-kriteriers terskler (se §5.4) |

### 3.2 `household_members`
| Kolonne | Type | Notat |
|---|---|---|
| `household_id` | uuid | fk → households |
| `user_id` | uuid | fk → auth.users |
| `role` | text | `owner` \| `member` |
| `joined_at` | timestamptz | |
| pk | (household_id, user_id) | |

Ingen maks-grense på medlemmer ✅. En bruker kan være i én husholdning om gangen (v2.0) — evt. flere senere.

### 3.3 `properties`
Delt på tvers av husholdningen.

| Kolonne | Type | Notat |
|---|---|---|
| `id` | uuid | pk |
| `household_id` | uuid | fk → households |
| `finn_code` | text | nullable, unik per household hvis satt |
| `finn_url` | text | |
| `address` | text | |
| `postal_code` | text | |
| `city` | text | |
| `price_asking` | int | NOK |
| `common_debt` | int | NOK |
| `total_price` | int | generert: asking + common_debt |
| `monthly_cost` | int | |
| `usable_area_m2` | numeric | |
| `primary_area_m2` | numeric | |
| `build_year` | int | |
| `ownership_type` | text | `eier` \| `andel` \| `aksje` |
| `property_type` | text | `leilighet` \| `enebolig` \| `rekkehus` \| ... |
| `rooms` | int | |
| `bedrooms` | int | |
| `floor` | int | |
| `has_balcony` | bool | |
| `has_elevator` | bool | |
| `energy_label` | text | A–G |
| `raw_finn_payload` | jsonb | full snapshot fra import for debug/reprocessing |
| `status` | text | se §6 |
| `added_by` | uuid | fk → auth.users |

### 3.4 `property_user_scores`
Uavhengig scoring per bruker.

| Kolonne | Type | Notat |
|---|---|---|
| `property_id` | uuid | fk |
| `user_id` | uuid | fk |
| `criterion_key` | text | ref. kriterium (se §5) |
| `score` | numeric(3,1) | 1.0–6.0, nullable |
| `note` | text | valgfri kommentar |
| pk | (property_id, user_id, criterion_key) | |

### 3.5 `property_agreed_scores`
Felles-karakter. Kan settes for **alle** kriterietyper (auto, attributt, subjektiv) ✅.

| Kolonne | Type | Notat |
|---|---|---|
| `property_id` | uuid | fk |
| `criterion_key` | text | |
| `score` | numeric(3,1) | 1.0–6.0 |
| `note` | text | valgfri |
| `set_by` | uuid | fk → auth.users |
| `set_at` | timestamptz | |
| pk | (property_id, criterion_key) | |

### 3.6 `household_weights`
Primær vektsett ✅. Brukes som default for alle beregninger.

| Kolonne | Type | Notat |
|---|---|---|
| `household_id` | uuid | fk |
| `criterion_key` | text | |
| `weight` | numeric | 0–10 e.l., summeres ikke nødvendigvis til 100 |
| pk | (household_id, criterion_key) | |

### 3.7 `user_weights`
Valgfri privat overstyring (brukes kun i "min personlige score"-visning, påvirker ikke felles-totalen) ✅.

| Kolonne | Type | Notat |
|---|---|---|
| `user_id` | uuid | |
| `household_id` | uuid | (for å kunne slette ved exit) |
| `criterion_key` | text | |
| `weight` | numeric | |
| pk | (user_id, criterion_key) | |

### 3.8 `criteria` (referansetabell eller seed/enum)
Starter som **seed-data** i migrasjon, ikke brukerredigerbar i v2.0. Vurderes åpnet senere.

```
criterion_key, label, type (auto|attribute|subjective), category, default_weight, unit, min, max, config_schema
```

### 3.9 `household_invites`
For å invitere partner.

| Kolonne | Type |
|---|---|
| `id` uuid pk | |
| `household_id` fk | |
| `email` text | |
| `token` text unique | |
| `expires_at` | |
| `accepted_at` | |

### 3.10 Views

- `v_property_user_totals`: samlet per (property, user) med snitt-score og vektet total.
- `v_property_shared_totals`: felles-karakter × household_weights.
- `v_property_disagreements`: kriterier hvor |user_a - user_b| ≥ 3 (terskel ✅).

---

## 4. Autentisering & RLS

- Supabase Auth (magic link + e-post/passord).
- **RLS på alle tabeller**. Hovedregel: rad er synlig/skrivbar hvis `auth.uid()` er medlem av `household_id`.
- `property_user_scores` og `user_weights` har ekstra skrivesjekk: kun egen `user_id`.
- `property_agreed_scores` kan skrives av alle medlemmer (med `set_by = auth.uid()`). Siste-skriving-vinner, ingen låsing i v2.0.
- Invitasjoner: tokens validert server-side i en Route Handler / Server Action.

---

## 5. Scoring-modell ✅

### 5.1 Kriterietyper
1. **Auto** — score regnes ut av appen fra `properties`-felt + husholdnings-terskler (f.eks. pris-per-kvm, byggeår, energimerke).
2. **Attributt** — ja/nei eller diskret valg på eiendommen som mappes til en karakter (f.eks. balkong = ja → 5, nei → 2).
3. **Subjektiv** — brukeren setter karakter 1–6 (beliggenhet, planløsning, nabolag, osv.).

### 5.2 Karakterskala
- **1.0–6.0**, 0.5-steg. Høyere er bedre.
- **Manglende score = 0 med advarsel** ✅. Total beregnes fortsatt, men UI markerer at kriteriet er usatt.

### 5.3 Totalberegning

For en bolig P og bruker U i husholdning H:

**Personlig total (U på P):**
```
total_user = Σ (score_user[c] × weight[c]) / Σ weight[c]
```
hvor `weight[c]` = `user_weights[c]` hvis satt, ellers `household_weights[c]`.

**Felles total (husholdningens total på P):**
```
for hvert kriterium c:
  effective_score[c] = agreed_score[c] hvis satt
                       ellers snitt(property_user_scores[c] over alle medlemmer)
total_shared = Σ (effective_score[c] × household_weights[c]) / Σ household_weights[c]
```

- Felles-override er gyldig for **alle** kriterietyper ✅ (også auto — da overstyrer husholdningen det appen regnet ut).
- Manglende scorer teller som 0 i sum, men UI viser advarsel på raden.

### 5.4 Auto-kriterie-terskler
Lagres i `households.auto_criteria_thresholds` (jsonb) ✅. Eksempel:

```json
{
  "price_per_sqm": { "excellent": 60000, "good": 80000, "poor": 110000 },
  "build_year":    { "excellent": 2010, "good": 1990, "poor": 1960 },
  "monthly_cost":  { "excellent": 4000, "good": 6000, "poor": 9000 }
}
```

Mapping fra verdi → karakter skjer deterministisk i en ren TS-funksjon (kan testes).

### 5.5 Uenighetsdeteksjon
- Terskel: **|score_a − score_b| ≥ 3** på et kriterium markeres som "stor uenighet" ✅.
- Vises som badge i compare-view og som en liste på property-detaljen ("Dere er uenige om: …").

---

## 6. Statuser ✅

Én enum-kolonne `properties.status`:

| Key | Label |
|---|---|
| `favoritt` | Favoritt |
| `vurderer` | Vurderer |
| `pa_visning` | På visning |
| `i_budrunde` | I budrunde |
| `bud_inne` | Bud inne |
| `kjopt` | Kjøpt |
| `ikke_aktuell` | Ikke aktuell |

- Status er delt i husholdningen (én status per bolig).
- Default ved opprettelse: `vurderer`.
- Historikk: valgfri `property_status_history` tabell (🟡 ikke prioritert i v2.0 — kan legges til).

---

## 7. Sider & flyter (informasjonsarkitektur)

```
/                          Landing / logget-ut
/login                     Supabase Auth
/onboarding                Opprett/join husholdning + vekter
/app                       Dashboard (favoritter + toppkandidater)
/app/properties            Liste (alle statuser, filter/sort)
/app/properties/new        Importer (FINN-lenke) eller manuell
/app/properties/[id]       Detalj: score-innlegging + shared overrides
/app/compare               Compare-view (Layout A, §8)
/app/household             Medlemmer, invitasjoner, vekter, auto-terskler
/app/settings              Profil, varsler, personlige vekter
```

---

## 8. Compare-view — Layout A ✅

Tabell med **kriterier som rader**, boliger som kolonner. I tillegg to oppsummeringskolonner pr bolig:

```
                Bolig 1              Bolig 2         ...
                ┌──────────┬───────┐ ┌──────────┬───────┐
                │ Snitt     │ Felles│ │ Snitt     │ Felles│
Kriterium A     │ 4.3       │ 5.0   │ │ 3.8       │ —     │
Kriterium B     │ 5.5       │ —     │ │ 4.0       │ 4.0   │
...
Total (vektet)  │ 4.6       │ 4.8   │ │ 3.9       │ 4.0   │
```

- **Snitt** = snitt av medlemmenes user-scores.
- **Felles** = agreed_score hvis satt, ellers "—".
- Radene kan foldes per kategori.
- Uenighets-badge på rader hvor terskelen er nådd.
- Sortering/filter på topp. Mobil: horisontal scroll med sticky kriterium-kolonne.

---

## 9. FINN-import 🟡 (førsteforslag)

**Antagelser (bekreft/korriger):**
- Bruker limer inn FINN-lenke eller finnkode.
- Server Action henter HTML fra finn.no og parser ut felter (ikke offentlig API).
- Parser kjøres server-side for å unngå CORS og for å skjule logikk.
- Rå HTML/JSON lagres i `properties.raw_finn_payload` for reprocessing når parseren forbedres.
- Dupe-detect: hvis `finn_code` allerede finnes i husholdningen → gå til eksisterende.

**Planlagte felter å hente (best effort):**
- adresse, postnummer, poststed
- prisantydning, fellesgjeld, totalpris, felleskostnader
- boligtype, eieform, byggeår
- primærrom, bruksareal
- antall rom, soverom, etasje
- balkong, heis, energimerke
- bilder (URLs) → valgfri nedlasting til Supabase Storage (v2.1)

**Risiko:** FINN endrer markup. Strategi: parser skrevet defensivt med felt-for-felt try/catch, og `raw_finn_payload` lar oss reparse uten ny henting. Legge på en **schema-versjon** på payloaden.

**Åpne spørsmål:**
- Skal vi også støtte manuell import fra andre portaler (Hybel, Krogsveen)? Forslag: **nei** i v2.0, kun FINN + manuell.
- Skal vi hente bilder ved import eller on-demand? Forslag: **on-demand** første gang bolig åpnes, cache i Storage.
- Hvor mye metadata skal vi forsøke å trekke ut av prospekt-PDF? Forslag: **ingen** i v2.0.

---

## 10. PWA

- Manifest + ikoner (192, 512, maskable).
- `theme_color`, `background_color` matcher design.
- Installerbar på iOS/Android.
- **Ingen service worker cache for dataruter** — vi ønsker ikke å vise stale scoring.
- SW kan caches statiske assets (neste: `next-pwa` i `runtimeCaching: []` eller tilsvarende minimal konfig).

---

## 11. Tredjepartstjenester og kostnader

| Tjeneste | Tier | Notat |
|---|---|---|
| Vercel | Hobby (gratis) | Cron gratis (1/dag min). |
| Supabase | Free | 500MB db, 1GB storage. Pauser uten trafikk → Cron fikser. |
| Domene | Eksisterende | 🟡 avklares |
| Sentry | Gratis hobby | Feilsporing. Valgfritt. |

---

## 12. Milestones 🟡 (førsteforslag)

### M0 — Scaffold (1–2 dager)
- [ ] Next.js 15-prosjekt i `v2/` (eller egen `apps/web`-mappe hvis vi vil turborepo)
- [ ] Tailwind v4 + shadcn oppsett
- [ ] Supabase-prosjekt (dev) + auth + tom migration-struktur
- [ ] Deploy til Vercel, env wiring
- [ ] Vercel Cron route som pinger Supabase

### M1 — Auth & husholdning (2–3 dager)
- [ ] Auth-flows (login, magic link)
- [ ] Opprett husholdning + invitasjon via e-post/token
- [ ] Godta invitasjon
- [ ] RLS-policies på households + household_members + household_invites

### M2 — Datamodell & seed (2 dager)
- [ ] Migrasjoner for alle tabeller i §3
- [ ] Seed `criteria`
- [ ] RLS på alle resterende tabeller
- [ ] Views (§3.10)

### M3 — Properties & scoring (3–5 dager)
- [ ] Manuell property-opprettelse
- [ ] Personlig scoring-UI (alle kriterietyper)
- [ ] Felles-override UI
- [ ] Auto-kriterie-kalkulasjon
- [ ] Household-vekter + personlige vekter
- [ ] Auto-terskler-redigering

### M4 — FINN-import (3–5 dager)
- [ ] Server Action: hent + parse
- [ ] Dupe-håndtering
- [ ] Robust feilhåndtering + raw_payload-lagring
- [ ] Test mot 10+ reelle annonser

### M5 — Compare + dashboard (3–4 dager)
- [ ] Layout A compare-view
- [ ] Uenighetsdeteksjon + badges
- [ ] Dashboard med favoritter + top N

### M6 — Polish (2–3 dager)
- [ ] PWA + ikoner
- [ ] Mobil-UX runde
- [ ] Tom-tilstander og advarsler
- [ ] Grunnleggende e2e-test (Playwright) på de viktigste flyter

### M7 — Migrasjon fra v1 (valgfri, ⏳ 1–2 dager)
- [ ] Eksport fra v1 Supabase
- [ ] Import-script til v2 schema
- [ ] v1 satt til read-only
- [ ] Cut-over

**Estimat totalt:** ~3–5 uker deltid.

---

## 13. Åpne spørsmål (samlet)

1. **FINN-import**: bekreft antagelsene i §9.
2. **Milestones**: rekkefølge og omfang ok? Skal noe droppes fra v2.0?
3. **Multi-household per bruker**: skal vi designe for det fra start selv om vi ikke bruker det? (Litt ekstra arbeid i RLS + join-tabellen, men åpner for framtiden.)
4. **Status-historikk** (§6): prioritert eller kan vente?
5. **Domene** + e-postavsender for invitasjoner.
6. **Migrering fra v1**: skal vi faktisk migrere eksisterende data, eller starte blankt?
7. **Stitch MCP**: hvilke skjermer skal vi designe først? Forslag: property-detalj (scoring-UI) + compare-view.

---

## 14. Mappestruktur (foreslått)

```
boligscore-v1/
├── App.tsx ...              # v1, urørt til cut-over
├── v2/
│   ├── PLAN.md              # dette dokumentet
│   ├── web/                 # Next.js 15-app (opprettes i M0)
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   ├── scoring/     # ren TS, testbar
│   │   │   └── finn/        # parser + types
│   │   └── ...
│   └── supabase/
│       ├── migrations/
│       └── seed.sql
```

---

## 15. Design (Stitch MCP)

Når Stitch MCP er koblet til i klienten, prioriter disse skjermene i rekkefølge:
1. **Property-detalj** (scoring-UI for alle 3 kriterietyper + felles-override-knapp)
2. **Compare-view** (Layout A, mobil + desktop)
3. **Dashboard**
4. **Husholdnings-innstillinger** (vekter + auto-terskler)
5. **FINN-import-skjerm** (lim inn lenke → preview → bekreft)

---

_Sist oppdatert i denne sesjonen. Endringer skal inn her før de implementeres._
