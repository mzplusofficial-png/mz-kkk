import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function testRLS() {
  console.log('--- Testing RLS Policies for users Table ---');

  // 1. Let's list some users using Admin Client (bypassing RLS)
  const { data: adminUsers, error: adminError } = await supabaseAdmin.from('users').select('id, email').limit(3);
  if (adminError) {
    console.error('Admin select failed:', adminError);
    return;
  }
  console.log('Admin select succeeded (RLS Bypassed). Found users:', adminUsers);

  if (adminUsers && adminUsers.length > 0) {
    const testUser = adminUsers[0];
    console.log(`Testing read for user ${testUser.email} (${testUser.id}) using ANON client:`);

    // 2. Querying user row using ANON client without session (Anonymous Public read)
    const { data: anonRead, error: anonReadErr } = await supabaseAnon
      .from('users')
      .select('*')
      .eq('id', testUser.id);
    
    if (anonReadErr) {
      console.log(`❌ ANON public read blocked: ${anonReadErr.code} - ${anonReadErr.message}`);
    } else {
      console.log(`ANON public read result: Success! Found ${anonRead?.length} rows`);
    }

    // 3. Let's see if we can perform a simulated Authenticated read. We can create a client and call setSession or simulate an auth payload.
    // However, in Supabase PostgREST, we can simulate an authenticated state by passing the JWT token if we can sign in.
    // Let's create a test user or see if we can create an auth session using Admin client, and then log in using that session.
  } else {
    console.log('No user exists in the users table to test with.');
  }
}

testRLS();
