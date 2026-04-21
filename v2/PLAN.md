# Boligscore v2 — Plan

> Status: arbeidsdokument. Landete avgjørelser ✅. Åpne punkter 🟡.
> v1-koden (`App.tsx`, `components/` i rot) lever videre til v2 er klar til cut-over.

---

## 1. Mål og ikke-mål

### Mål
- Ny versjon av Boligscore for husholdninger (2+ brukere) som sammen vurderer boliger.
- Uavhengige karakterer per bruker + **felles-karakter** som kan overstyre totalen.
- Delt eiendomsliste, personlig scoring-opplevelse.
- Moderne stack, god mobil-UX (PWA), enkel å drifte.
- **Arkitektur som lar oss skalere til andre domener (bil, sofa, …) senere uten å bygge om kjernen.**

### Ikke-mål (v2.0)
- Offline-støtte.
- Avansert AI-analyse.
- Andre domener enn bolig — men sømmer er bygget inn.
- Maks-grense for antall husholdningsmedlemmer.

---

## 2. Stack ✅

| Lag | Valg |
|-----|------|
| Frontend | Next.js 15 (App Router, RSC, Server Actions) |
| Språk | TypeScript (strict) |
| Styling | Tailwind v4 + shadcn/ui |
| DB/Auth | Supabase (Postgres + Auth + RLS + Storage) — **ny cloud-instans for v2** |
| Hosting | Vercel |
| Keep-alive | Vercel Cron pinger Supabase (free tier pauser uten trafikk) |
| PWA | `next-pwa` — installerbar, ingen offline-cache av data |
| Package manager | pnpm |
| UI-språk | Norsk (bokmål). i18n kan komme senere. |
| Design-input | Stitch (ekstern) |

---

## 3. Arkitekturvalg (tekniske) ✅

1. **Server Components som default**, Client Components kun ved state/interaksjon (skjemaer, chip-rader, tabs).
2. **Server Actions** for all mutasjon. Ingen egne REST-endepunkter med mindre nødvendig (Vercel Cron osv.).
3. **Supabase-klienter**: server (RSC/Actions), server-admin (service role, cron), browser (for realtime senere). Standard `@supabase/ssr`.
4. **Types**: generert med `supabase gen types typescript` → `lib/supabase/types.ts`. Kjøres som script.
5. **Skjemaer**: `react-hook-form` + `zod`. Zod-schema delt mellom client og action.
6. **Scoring-logikken** i `lib/scoring/` som rene TS-funksjoner, ingen DB-avhengighet. Enhetstestbar.
7. **Env**: `@t3-oss/env-nextjs` for type-sikre env-vars.
8. **Middleware** for auth-redirects på `/app/**`.
9. **Testing**: Vitest for `lib/scoring/`, Playwright for 1–2 e2e-flyter i M6.
10. **Mappestruktur** inne i `v2/web/`:
    ```
    app/
    components/          # shadcn + delte
    features/            # properties/, scoring/, household/, finn/
    lib/
      supabase/
      scoring/
      finn/
      env.ts
    ```

---

## 4. Domene-ekstensibilitet (Option B) ✅

Vi bygger bolig-spesifikt nå, men med rene sømmer slik at bil/sofa/feriested senere er **nye detalj-tabeller + parser + views**, ikke ombygging av kjernen.

### Nøkkelgrep
- Abstrakt `scoreables`-tabell eier id + domain + husholdning.
- `properties` refererer `scoreables` 1:1, har bolig-spesifikke felter.
- Scoring-tabeller (`user_scores`, `agreed_scores`, `weights`) refererer `scoreable_id`, ikke `property_id`.
- `criteria.domain` lar oss ha ulike kriterie-sett per domene.
- UI-komponenter er data-agnostiske (ta props, ikke et property-objekt).

---

## 5. Datamodell ✅

Alle tabeller: `id uuid pk`, `created_at timestamptz`, `updated_at timestamptz` (via trigger) der ikke annet er oppgitt.

### 5.1 `households`
| Kolonne | Type |
|---|---|
| `id` | uuid pk |
| `name` | text |
| `created_by` | uuid → auth.users |

### 5.2 `household_members`
Multi-household støttes ✅ — én bruker kan være i flere husholdninger.

| Kolonne | Type |
|---|---|
| `household_id` | uuid → households |
| `user_id` | uuid → auth.users |
| `role` | text (`owner` \| `member`) |
| `joined_at` | timestamptz |
| pk | (household_id, user_id) |

### 5.3 `scoreables`
Generisk "ting som kan scores". Mellom-abstraksjon.

| Kolonne | Type |
|---|---|
| `id` | uuid pk |
| `household_id` | uuid → households |
| `domain` | text (`property`, senere: `car`, `sofa`, …) |
| `added_by` | uuid → auth.users |
| `status` | text (se §7) |

### 5.4 `properties`
Domene-detaljer for `domain = 'property'`.

| Kolonne | Type | Notat |
|---|---|---|
| `scoreable_id` | uuid pk → scoreables(id) | 1:1 |
| `finn_code` | text | unik per household hvis satt |
| `finn_url` | text | |
| `address` | text | |
| `postal_code` | text | |
| `city` | text | |
| `price_asking` | int | NOK |
| `common_debt` | int | |
| `total_price` | int | generert |
| `monthly_cost` | int | |
| `usable_area_m2` | numeric | |
| `primary_area_m2` | numeric | |
| `build_year` | int | |
| `ownership_type` | text | eier / andel / aksje |
| `property_type` | text | leilighet / enebolig / rekkehus / … |
| `rooms` | int | |
| `bedrooms` | int | |
| `floor` | int | |
| `has_balcony` | bool | |
| `has_elevator` | bool | |
| `energy_label` | text | A–G |
| `raw_finn_payload` | jsonb | debug/reprocessing |

### 5.5 `criteria` (seed)
| Kolonne | Type |
|---|---|
| `key` | text pk |
| `domain` | text (`property`, …) |
| `label` | text |
| `type` | text (`subjective` \| `attribute`) |
| `category` | text (for grupping i UI) |
| `description` | text |
| `default_weight` | numeric |
| `sort_order` | int |

**Auto-kriterietypen er fjernet** ✅. Auto-beregnede fakta (pris/kvm, alder, osv.) vises som read-only info på bolig-siden, ikke som scorede rader.

### 5.6 `user_scores`
| Kolonne | Type |
|---|---|
| `scoreable_id` | uuid → scoreables |
| `user_id` | uuid |
| `criterion_key` | text → criteria(key) |
| `score` | numeric(4,1) (0.0–10.0, 0.5-steg) |
| pk | (scoreable_id, user_id, criterion_key) |

### 5.7 `agreed_scores`
Felles-karakter. Gyldig for alle kriterietyper.

| Kolonne | Type |
|---|---|
| `scoreable_id` | uuid → scoreables |
| `criterion_key` | text |
| `score` | numeric(4,1) |
| `set_by` | uuid |
| `set_at` | timestamptz |
| pk | (scoreable_id, criterion_key) |

### 5.8 `household_weights`
Primær vekting, delt i husholdningen.

| Kolonne | Type |
|---|---|
| `household_id` | uuid |
| `criterion_key` | text |
| `weight` | numeric (0–10) |
| pk | (household_id, criterion_key) |

### 5.9 `user_weights`
Valgfri privat overstyring — brukes kun i personlig score-visning.

| Kolonne | Type |
|---|---|
| `user_id` | uuid |
| `household_id` | uuid |
| `criterion_key` | text |
| `weight` | numeric |
| pk | (user_id, household_id, criterion_key) |

### 5.10 `user_comments`
Kommentar per bruker, per scoreable. Delte (synlig for alle i husholdningen).

| Kolonne | Type |
|---|---|
| `id` | uuid pk |
| `scoreable_id` | uuid |
| `user_id` | uuid |
| `body` | text |

### 5.11 `user_notes`
**Private** notater per bruker.

| Kolonne | Type |
|---|---|
| `id` | uuid pk |
| `scoreable_id` | uuid |
| `user_id` | uuid |
| `body` | text |

### 5.12 `shared_notes`
**Delte** notater i husholdningen. Kan opprettes når som helst (typisk etter at medlemmer har blitt enige).

| Kolonne | Type |
|---|---|
| `id` | uuid pk |
| `scoreable_id` | uuid |
| `body` | text |
| `last_edited_by` | uuid |

### 5.13 `household_invites`
| Kolonne | Type |
|---|---|
| `id` | uuid pk |
| `household_id` | uuid |
| `email` | text (nullable — ved "kopier lenke") |
| `token` | text unique |
| `expires_at` | timestamptz |
| `accepted_at` | timestamptz |

### 5.14 Views
- `v_user_totals` — vektet total per (scoreable, user).
- `v_shared_totals` — felles-total per scoreable.
- `v_disagreements` — rader hvor |Δ| over uenighetsterskel.

---

## 6. Autentisering & RLS ✅

- Supabase Auth (magic link + e-post/passord).
- RLS på alle tabeller. Hovedregel: rad synlig/skrivbar hvis `auth.uid()` er medlem av `household_id`.
- `user_scores`, `user_weights`, `user_notes`, `user_comments`: skriv-sjekk krever egen `user_id`.
- `agreed_scores`, `shared_notes`: skrivbar av alle medlemmer, siste-skriving-vinner i v2.0.
- Invitasjoner: tokens valideres server-side i Server Action.

---

## 7. Statuser ✅

Én enum-kolonne `scoreables.status`:

| Key | Label |
|---|---|
| `favoritt` | Favoritt |
| `vurderer` | Vurderer |
| `pa_visning` | På visning |
| `i_budrunde` | I budrunde |
| `bud_inne` | Bud inne |
| `kjopt` | Kjøpt |
| `ikke_aktuell` | Ikke aktuell |

Default: `vurderer`. Status er delt i husholdningen.

---

## 8. Scoring-modell ✅

### 8.1 Skala
- **0–10 i 0.5-steg**. Høyere er bedre.
- Totalscore vises som **vektet snitt på samme skala (0–10)** — ikke /100.

### 8.2 Kriterietyper
1. **Subjektiv** — bruker setter karakter 0–10 (kjøkken, beliggenhet, …).
2. **Attributt** — ja/nei eller diskret valg på boligen som mappes til en karakter (balkong=ja → 8, nei → 2).

(Auto er **fjernet** — ingen auto-scorede rader.)

### 8.3 Totalberegning

For en scoreable S og bruker U i husholdning H:

**Personlig total:**
```
weights[c] = user_weights[c] hvis satt, ellers household_weights[c]
total_user = Σ(score[c] × weights[c]) / Σ(weights[c])   over scorede c
```

**Felles total:**
```
for hvert kriterium c:
  effective[c] = agreed[c] hvis satt
                 ellers snitt(user_scores[c] over alle medlemmer som har scoret)
total_shared = Σ(effective[c] × household_weights[c]) / Σ(household_weights[c])   over c med verdi
```

### 8.4 Manglende score 🟡 (foreslått default, bekreft)
**Ekskluder fra beregningen**: divisoren krymper så totalen reflekterer det som faktisk er scoret. UI viser advarsel ("3 kriterier mangler — regnes ikke med").

(Alternativ: tell manglende som 0 — men på 0–10 er 0 gyldig "verste", så dette er forvirrende.)

### 8.5 Uenighetsterskel 🟡 (foreslått default, bekreft)
**|Δ| ≥ 5** markeres som "stor uenighet" (tilsvarer ≥3 på gammel 1–6-skala).

Alternativ: ≥4 hvis vi vil være strengere.

### 8.6 Felles-override
Gyldig for alle kriterier. Inline-redigering i compare-view. Live lagring, siste-skriving-vinner.

---

## 9. Kriterier (seed-liste for domain=`property`) 🟡

22 kriterier, forslag. Kan endres.

### Bolig innvendig (8)
1. Kjøkken
2. Bad
3. Planløsning
4. Lys og luftighet
5. Oppbevaring
6. Stue
7. Balkong/terrasse
8. Soverom

### Beliggenhet & område (6)
9. Områdeinntrykk
10. Nabolagsfølelse
11. Offentlig transport
12. Nærhet til jobb/sentrum
13. Skoler/barnehager
14. Grøntområder / tur

### Standard & tilstand (4)
15. Generell standard
16. Byggeår/alder (opplevd)
17. Støynivå
18. Parkering/garasje

### Helhet (4)
19. Inntrykk på visning
20. Potensial (oppussing, utvidelse)
21. Pris vs forventning
22. Magefølelse

Alle er `subjective` med mindre annet bestemmes. Noen kan flyttes til `attribute` (balkong, parkering) hvis det gir mer mening.

---

## 10. Sider & flyter (informasjonsarkitektur) ✅

```
/                          Landing (logget ut)
/login, /registrer         Supabase Auth
/invitasjon/[token]        Godta invitasjon
/app                       Dashboard (Boliger)
/app/properties/new        Importer FINN / manuell
/app/properties/[id]       Detalj (Oversikt / Min vurdering / Sammenligning / Kommentarer / Notater)
/app/compare               Compare-view (Layout A)
/app/weights               Vekter (felles + personlige)
/app/household             Husstand (medlemmer, invitasjoner)
/app/settings              Meg (profil, tema, …)
```

- Bunnmeny på mobil: **Boliger / Vekter / Husstand / Meg**.
- Husholdning-velger øverst (dropdown) fordi multi-household støttes.

---

## 11. Compare-view — Layout A ✅

Tabell: kriterier som rader, boliger som kolonner. Per bolig to kolonner: **Snitt** (av medlemmer) + **Felles** (agreed, editerbar inline).

- Rader gruppert etter kategori (foldbart).
- Uenighet-badge på rader over terskelen.
- Sortering/filter på topp.
- Mobil: horisontal scroll med sticky kriterium-kolonne.

---

## 12. FINN-import 🟡

Antagelser (bekreft):
- Bruker limer inn FINN-lenke/finn-kode.
- Server Action henter HTML + parser defensivt. Rå payload lagres i `properties.raw_finn_payload`.
- Dupe-detect på `finn_code` per household.
- Bilder: on-demand nedlasting til Supabase Storage (v2.1), URLs bare i starten.
- Andre portaler: ikke støttet i v2.0.
- Prospekt-PDF-parsing: ikke støttet i v2.0.

---

## 13. PWA ✅

- Manifest + ikoner (192, 512, maskable).
- `theme_color`, `background_color` matcher design.
- Installerbar iOS/Android.
- **Ingen SW-cache for data** — vi vil ikke vise stale scoring.
- SW kan cache statiske assets.

---

## 14. Milestones 🟡

### M0 — Scaffold ✅ plan klar
- [ ] Next.js 15 i `v2/web/`
- [ ] Tailwind v4 + shadcn
- [ ] `v2/supabase/migrations/` tom
- [ ] Env-wiring (`@t3-oss/env-nextjs`)
- [ ] Vercel Cron keep-alive-rute
- [ ] Deploy til Vercel

### M1 — Auth & husholdning
- [ ] Login / registrer
- [ ] Opprett husholdning + invite via e-post/lenke
- [ ] Godta invitasjon
- [ ] Multi-household dropdown + switch
- [ ] RLS: households, household_members, household_invites

### M2 — Datamodell & seed
- [ ] Migrasjoner for §5
- [ ] Seed criteria (§9)
- [ ] RLS resten
- [ ] Views (§5.14)
- [ ] Type-generering wired

### M3 — Properties & scoring
- [ ] Manuell bolig-opprettelse
- [ ] Scoring-UI (subjective + attribute)
- [ ] Felles-override UI
- [ ] Household-vekter + personlige vekter
- [ ] Kommentarer (delt per bruker), private notater, delt notat
- [ ] Statuser

### M4 — FINN-import
- [ ] Server Action hent+parse
- [ ] Dupe-håndtering + feilfallback til manuelt skjema
- [ ] Test mot 10+ reelle annonser

### M5 — Compare + dashboard
- [ ] Layout A compare-view
- [ ] Uenighetsdeteksjon + badges
- [ ] Dashboard med favoritter + topp N

### M6 — Polish
- [ ] PWA + ikoner
- [ ] Mobil-UX runde
- [ ] Tom- og feiltilstander
- [ ] Playwright på kritiske flyter

### M7 — Valgfri: migrering fra v1
Avklares senere.

**Estimat:** ~3–5 uker deltid.

---

## 15. Åpne spørsmål 🟡

1. **Uenighetsterskel**: ≥5 (foreslått) eller ≥4?
2. **Manglende score**: ekskluder (foreslått) eller tell som 0?
3. **Kriterie-listen i §9**: godkjenner vi 22 som de er, eller justerer?
4. **Domene** + e-postavsender for invitasjoner (trengs først i M1).
5. **Status-historikk**: prioritert eller ikke?
6. **Migrering fra v1**: ja eller ren nystart?
7. **Attributt-kriterier**: hvilke av de 22 bør være `attribute` i stedet for `subjective`? (balkong, parkering kandidater)

---

## 16. Mappestruktur (landet) ✅

```
boligscore-v1/
├── App.tsx ...              # v1, urørt til cut-over
├── v2/
│   ├── PLAN.md
│   ├── web/                 # Next.js 15 (M0)
│   └── supabase/
│       ├── migrations/
│       └── seed.sql
```

---

## 17. Design (Stitch)

Prioriterte skjermer:
1. Property-detalj — scoring-UI
2. Compare-view (Layout A) — mobil + desktop
3. Dashboard (Boliger)
4. Vekter
5. FINN-import

Stitch MCP er ikke koblet til i min sesjon — brief matet inn manuelt.

---

_Sist oppdatert: etter landing av 0–10-skala, multi-household, scoreables-abstraksjon, fjerning av auto, notater/kommentarer._
