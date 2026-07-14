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

const tempEmail = `test_register_${Math.floor(Math.random() * 100000)}@mz.plus`;
const tempPassword = 'testpassword123!';

async function testCreate() {
  console.log(`=== TESTING ACCOUNT CREATION ===`);
  console.log(`Target Temp Email: ${tempEmail}`);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Automatic Trigger User',
        country: 'France'
      }
    });

    if (error) {
      console.error('[FAIL] admin.createUser returned error:', error);
    } else {
      console.log('[SUCCESS] admin.createUser succeeded! Created user:', data.user?.id, data.user?.email);
      
      // Let's verify if the row was created in public.users (potentially via a database trigger)
      const { data: profile, error: profErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user?.id)
        .maybeSingle();

      if (profErr) {
        console.error('[ERROR] Querying public.users row:', profErr.message);
      } else if (profile) {
        console.log('[INFO] Profile row was auto-created/found in public.users:');
        console.log(JSON.stringify(profile, null, 2));
      } else {
        console.log('[WARNING] No profile row was found in public.users! The auto-trigger might be missing or disabled.');
      }

      // Cleanup
      console.log('\nCleaning up created test user...');
      const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(data.user?.id || '');
      if (delAuthErr) {
        console.error('[WARNING] Failed to clean up auth user:', delAuthErr.message);
      } else {
        console.log('[INFO] Succeeded in deleting test user from auth.users');
      }

      if (profile) {
        const { error: delProfErr } = await supabaseAdmin.from('users').delete().eq('id', data.user?.id);
        if (delProfErr) {
          console.error('[WARNING] Failed to clean up user profile from public.users:', delProfErr.message);
        } else {
          console.log('[INFO] Succeeded in deleting test user profile from public.users');
        }
      }
    }
  } catch (err: any) {
    console.error('Fatal exception during test account creation:', err.message || err);
  }
}

testCreate();
