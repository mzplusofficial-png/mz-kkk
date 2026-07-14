import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing key or URL.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnose() {
  console.log(`=== CHECKING GENERAL USERS ===`);
  console.log('Using endpoint:', SUPABASE_URL);

  // 1. Count and get first 5 in public.users
  const { data: publicUsers, count, error: publicErr } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, created_at', { count: 'exact' })
    .limit(5);

  if (publicErr) {
    console.error('Error reading from public.users:', publicErr.message);
  } else {
    console.log(`Total rows in public.users count: ${count}`);
    console.log(`First 5 rows in public.users:`);
    console.log(JSON.stringify(publicUsers, null, 2));
  }

  // 2. Count and get first 5 in auth.users
  try {
    const { data: { users }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) {
      console.error('Error listing auth.users:', authErr.message);
    } else {
      console.log(`Total users in auth.users: ${users.length}`);
      console.log(`First 5 users in auth.users:`);
      console.log(JSON.stringify(users.slice(0, 5).map(u => ({ id: u.id, email: u.email, created_at: u.created_at })), null, 2));
    }
  } catch (err: any) {
    console.error('Exception during auth.admin.listUsers:', err.message || err);
  }
}

diagnose();
