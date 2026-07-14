import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testAnonSelect() {
  console.log('--- Testing Anon Select (No Auth) ---');
  
  const tables = [
    'mz_app_config',
    'platform_settings',
    'mz_sound_effects',
    'products',
    'ranks'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabaseAnon.from(table).select('*').limit(1);
      if (error) {
        console.error(`[BLOCKED] Table ${table}: ${error.code} - ${error.message}`);
      } else {
        console.log(`[ALLOWED] Table ${table}: Select succeeded (Found ${data?.length} rows)`);
      }
    } catch (err: any) {
      console.error(`[ERROR] Table ${table}:`, err.message || err);
    }
  }
}

testAnonSelect();
