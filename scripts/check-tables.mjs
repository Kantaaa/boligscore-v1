import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const sb = createClient(url, key, { auth: { persistSession: false } });

const tables = ['households', 'household_members', 'household_invitations', 'properties', 'property_statuses', 'criteria', 'criterion_sections', 'household_weights', 'user_weights', 'property_scores', 'property_felles_scores'];

for (const t of tables) {
  const r = await sb.from(t).select('*').limit(1);
  if (r.error) console.log(`${t}: MISSING (${r.error.code} ${r.error.message})`);
  else console.log(`${t}: EXISTS (got ${r.data?.length ?? 0} rows)`);
}
