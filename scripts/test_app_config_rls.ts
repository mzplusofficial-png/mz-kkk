import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testAppConfigRLS() {
  console.log('--- Testing RLS Policies for mz_app_config Table ---');
  
  const { data, error } = await supabaseAnon
    .from('mz_app_config')
    .upsert({ id: 'main-config', app_name: 'Test Setup config v3' })
    .select('*');

  if (error) {
    console.error(`❌ Client-side write to mz_app_config FAILED: ${error.code} - ${error.message}`);
    console.log('Detail:', error.details || 'No detail');
  } else {
    console.log('✅ Client-side write to mz_app_config SUCCEEDED:', data);
  }
}

testAppConfigRLS();
