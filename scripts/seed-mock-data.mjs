// scripts/seed-mock-data.mjs
//
// Idempotent demo seed for the hosted dev project. Creates:
//   - Household "Ine & Kanta" (alice = owner, bob = member)
//   - 4 properties at varying statuses
//   - Realistic scores from both users (with intentional disagreement)
//   - A few felles scores set, others left to default to "snitt placeholder"
//   - One adjusted felles weight + one personal-weight tweak
//   - A section note on one property
//
// Re-running deletes the existing "Ine & Kanta" household (cascades) and
// rebuilds. Pass --keep to skip the rebuild if the household exists.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
//
// Run:  node scripts/seed-mock-data.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const secret = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const sb = createClient(url, secret, { auth: { persistSession: false } });

const KEEP_IF_EXISTS = process.argv.includes("--keep");
const HOUSEHOLD_NAME = "Ine & Kanta";

async function userIdByEmail(email) {
  const { data } = await sb.auth.admin.listUsers();
  const u = data.users.find((u) => u.email === email);
  if (!u) throw new Error(`Missing user: ${email}. Run scripts/seed-dev-users.mjs first.`);
  return u.id;
}

async function statusIdByLabel(label) {
  const { data } = await sb
    .from("property_statuses")
    .select("id")
    .is("household_id", null)
    .eq("label", label)
    .single();
  return data.id;
}

async function criterionIdByKey(key) {
  const { data } = await sb.from("criteria").select("id").eq("key", key).single();
  return data.id;
}

async function sectionIdByKey(key) {
  const { data } = await sb.from("criterion_sections").select("id").eq("key", key).single();
  return data.id;
}

async function main() {
  const alice = await userIdByEmail("alice@test.local");
  const bob = await userIdByEmail("bob@test.local");

  // 1. Household
  let { data: existing } = await sb
    .from("households")
    .select("id")
    .eq("name", HOUSEHOLD_NAME)
    .eq("created_by", alice)
    .maybeSingle();

  if (existing && KEEP_IF_EXISTS) {
    console.log(`[skip] "${HOUSEHOLD_NAME}" already exists (id ${existing.id}). --keep set.`);
    return;
  }
  if (existing) {
    console.log(`[reset] deleting existing "${HOUSEHOLD_NAME}" (id ${existing.id}) and rebuilding...`);
    await sb.from("households").delete().eq("id", existing.id);
  }

  const { data: household, error: hhErr } = await sb
    .from("households")
    .insert({ name: HOUSEHOLD_NAME, created_by: alice })
    .select("id")
    .single();
  if (hhErr) throw hhErr;
  const hid = household.id;
  console.log(`[ok] created household ${hid}`);

  // Members
  await sb.from("household_members").insert([
    { household_id: hid, user_id: alice, role: "owner" },
    { household_id: hid, user_id: bob, role: "member" },
  ]);
  console.log("[ok] added alice (owner) + bob (member)");

  // 2. Properties
  const vurderer = await statusIdByLabel("vurderer");
  const paaVisning = await statusIdByLabel("på visning");
  const iBudrunde = await statusIdByLabel("i budrunde");
  const ikkeAktuell = await statusIdByLabel("ikke aktuell");

  const props = [
    {
      address: "Storgata 1, 0182 Oslo",
      price: 5_200_000,
      costs: 60_000,
      monthly_costs: 4_500,
      bra: 70,
      primary_rooms: 3,
      bedrooms: 2,
      bathrooms: 1,
      year_built: 2010,
      property_type: "Leilighet",
      floor: "3",
      status_id: vurderer,
      added_by: alice,
    },
    {
      address: "Bergveien 14, 0481 Oslo",
      price: 8_900_000,
      costs: 95_000,
      monthly_costs: 0,
      bra: 145,
      primary_rooms: 5,
      bedrooms: 4,
      bathrooms: 2,
      year_built: 1985,
      property_type: "Enebolig",
      floor: null,
      status_id: paaVisning,
      added_by: bob,
    },
    {
      address: "Solveien 22B, 0379 Oslo",
      price: 6_500_000,
      costs: 75_000,
      monthly_costs: 2_800,
      bra: 95,
      primary_rooms: 4,
      bedrooms: 3,
      bathrooms: 1.5,
      year_built: 2018,
      property_type: "Rekkehus",
      floor: null,
      status_id: iBudrunde,
      added_by: alice,
    },
    {
      address: "Akersveien 50, 0177 Oslo",
      price: 4_100_000,
      costs: 45_000,
      monthly_costs: 5_200,
      bra: 55,
      primary_rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      year_built: 1965,
      property_type: "Leilighet",
      floor: "1",
      status_id: ikkeAktuell,
      added_by: bob,
    },
  ];

  const { data: insertedProps, error: propErr } = await sb
    .from("properties")
    .insert(props.map((p) => ({ household_id: hid, ...p })))
    .select("id, address");
  if (propErr) throw propErr;
  console.log(`[ok] inserted ${insertedProps.length} properties`);

  // 3. Scores. We'll use Storgata + Solveien for substantial scoring; the
  // others stay sparsely scored to demo the "X av 22" counter.
  const storgata = insertedProps.find((p) => p.address.startsWith("Storgata")).id;
  const solveien = insertedProps.find((p) => p.address.startsWith("Solveien")).id;
  const bergveien = insertedProps.find((p) => p.address.startsWith("Bergveien")).id;

  // Alice scores Storgata (mostly high) and Solveien (mixed). Bob scores
  // Storgata (slightly lower) and Solveien (mixed similarly). One row of
  // intentional 3+ disagreement each so the comparison highlight kicks in.
  const aliceStorgata = {
    kjokken: 8, bad: 7, planlosning: 8, lys_luft: 9, oppbevaring: 6,
    stue: 8, balkong_terrasse: 7, antall_soverom: 7, antall_bad: 6,
    omradeinntrykk: 9, nabolagsfolelse: 8, transport: 9, skoler: 8,
    beliggenhet_makro: 9, parkering: 5, stoy: 6,
    visningsinntrykk: 8, potensial: 7, tilstand: 8, hage: 4,
    utleiedel: 3, solforhold: 7,
  };
  const bobStorgata = {
    kjokken: 7, bad: 8, planlosning: 7, lys_luft: 8, oppbevaring: 5,
    stue: 7, balkong_terrasse: 7, antall_soverom: 7, antall_bad: 6,
    omradeinntrykk: 8, nabolagsfolelse: 8, transport: 9, skoler: 7,
    beliggenhet_makro: 8, parkering: 4, stoy: 4,            // stoy: 4 vs alice 6 = Δ2 (no highlight)
    visningsinntrykk: 5, potensial: 9,                       // visningsinntrykk: 5 vs 8 = Δ3 → highlight
    tilstand: 7, hage: 4, utleiedel: 3, solforhold: 6,
  };
  const aliceSolveien = {
    kjokken: 9, bad: 8, planlosning: 9, lys_luft: 7, oppbevaring: 8,
    stue: 9, balkong_terrasse: 8, antall_soverom: 8, antall_bad: 7,
    omradeinntrykk: 7, nabolagsfolelse: 7, transport: 6, skoler: 9,
    beliggenhet_makro: 7, parkering: 8, stoy: 7,
    visningsinntrykk: 9, potensial: 8, tilstand: 9, hage: 8,
    utleiedel: 5, solforhold: 8,
  };
  const bobSolveien = {
    kjokken: 9, bad: 8, planlosning: 9, lys_luft: 7, oppbevaring: 8,
    stue: 9, balkong_terrasse: 8, antall_soverom: 8, antall_bad: 7,
    omradeinntrykk: 7, nabolagsfolelse: 4,                   // 4 vs 7 = Δ3 → highlight
    transport: 5, skoler: 9, beliggenhet_makro: 7, parkering: 8, stoy: 7,
    visningsinntrykk: 8, potensial: 9, tilstand: 9, hage: 8,
    utleiedel: 5, solforhold: 8,
  };

  // Bergveien — only alice scores a few (demo "X av 22 scoret" partial state).
  const aliceBergveien = {
    kjokken: 6, bad: 5, beliggenhet_makro: 7, hage: 9, tilstand: 5,
  };

  async function applyScores(propertyId, userId, byKey) {
    const rows = [];
    for (const [key, score] of Object.entries(byKey)) {
      const cid = await criterionIdByKey(key);
      rows.push({ property_id: propertyId, user_id: userId, criterion_id: cid, score });
    }
    const { error } = await sb.from("property_scores").upsert(rows);
    if (error) throw error;
  }

  await applyScores(storgata, alice, aliceStorgata);
  await applyScores(storgata, bob, bobStorgata);
  await applyScores(solveien, alice, aliceSolveien);
  await applyScores(solveien, bob, bobSolveien);
  await applyScores(bergveien, alice, aliceBergveien);
  console.log("[ok] scored Storgata + Solveien (full) and Bergveien (partial)");

  // 4. Felles scores — set ~half on Storgata so the matrix shows mixed state.
  const fellesStorgata = {
    kjokken: 8, bad: 7, planlosning: 8, lys_luft: 8, oppbevaring: 5,
    omradeinntrykk: 8, transport: 9, skoler: 7,
    visningsinntrykk: 7, potensial: 8,
  };
  const fellesRows = [];
  for (const [key, score] of Object.entries(fellesStorgata)) {
    const cid = await criterionIdByKey(key);
    fellesRows.push({ property_id: storgata, criterion_id: cid, score, updated_by: alice });
  }
  await sb.from("property_felles_scores").upsert(fellesRows);
  console.log(`[ok] set ${fellesRows.length}/22 felles scores on Storgata`);

  // 5. Tweak a couple of weights to show non-default state
  const beliggenhetMakro = await criterionIdByKey("beliggenhet_makro");
  const kjokken = await criterionIdByKey("kjokken");
  await sb.from("household_weights").update({ weight: 9, updated_by: alice }).eq("household_id", hid).eq("criterion_id", beliggenhetMakro);
  await sb.from("household_weights").update({ weight: 8, updated_by: alice }).eq("household_id", hid).eq("criterion_id", kjokken);
  await sb.from("user_weights").update({ weight: 10 }).eq("household_id", hid).eq("user_id", alice).eq("criterion_id", beliggenhetMakro);
  console.log("[ok] adjusted 2 felles weights + 1 personal weight");

  // 6. A section note on Storgata
  const helhet = await sectionIdByKey("helhet");
  await sb.from("property_section_notes").upsert([
    {
      property_id: storgata,
      user_id: alice,
      section_id: helhet,
      body: "Likte virkelig stua. Litt usikker på utleiepotensialet — sjekke gnr/bnr.",
      visibility: "private",
    },
  ]);
  console.log("[ok] added a private section note from alice");

  console.log("\n=== Done ===");
  console.log(`Sign in via /dev/login?as=alice (eller ?as=bob) to see the household.`);
  console.log(`Household id: ${hid}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
