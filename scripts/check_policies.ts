import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder-fill-env-vars.supabase.co', 
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON || 'placeholder'
);

async function checkPolicies() {
  console.log('--- Checking RLS Policies on mz_app_config ---');
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'mz_app_config';"
    });

    if (error) {
      // If execute_sql RPC doesn't exist, we can try to inspect some query metadata or get schemas
      console.log('RPC execute_sql failed. Let us try querying raw metadata if possible.');
      // Let's do a direct select on pg_policies using custom execution or inspect tables
      const { data: testSelect, error: errSelect } = await supabase.from('mz_app_config').select('*').limit(1);
      console.log('Direct select on mz_app_config test:', { data: testSelect, error: errSelect });
    } else {
      console.log('Policies configured:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkPolicies();
