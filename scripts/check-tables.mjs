import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const sb = createClient(url, key, { auth: { persistSession: false } });

const tables = ['households', 'household_members', 'household_invitations', 'properties', 'property_statuses', 'criteria', 'criterion_sections', 'household_weights', 'user_weights', 'property_scores', 'property_felles_scores'];

for (const t of tables) {
  const { error, count } = await sb.from(t).select('*', { count: 'exact', head: true });
  if (error) console.log(`${t}: MISSING (${error.code} ${error.message})`);
  else console.log(`${t}: EXISTS (${count} rows)`);
}

console.log('\n--- property_statuses contents ---');
const { data, error } = await sb.from('property_statuses').select('label, household_id, is_terminal, sort_order').order('sort_order');
if (error) console.log('error:', error.message);
else console.log(data);
