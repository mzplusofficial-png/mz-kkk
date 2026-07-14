import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUsersPolicies() {
  console.log('--- Checking RLS Policies on users Table ---');
  try {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'users';"
    });

    if (error) {
      console.log('RPC execute_sql failed. Executing alternative check query.');
      // Direct query of metadata or policies in information schema
      console.log('Error info:', error);
    } else {
      console.log('Policies configured for tablename users:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUsersPolicies();
