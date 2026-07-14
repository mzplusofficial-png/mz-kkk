import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testUserInsertion() {
  console.log('--- Testing User Insertion (Simulated Signup) ---');
  const fakeId = '00000000-0000-0000-0000-000000000001';
  const newProfile = {
    id: fakeId,
    email: 'test_signup_temp@gmail.com',
    full_name: 'Test Signup Client',
    referral_code: 'TSTSGN',
    rank_id: 1,
    is_admin: false,
    user_level: 'standard'
  };

  try {
    const { data, error } = await supabaseAnon
      .from('users')
      .insert([newProfile])
      .select('*');

    if (error) {
      console.error(`❌ Simulated Insertion FAILED: ${error.code} - ${error.message}`);
      console.log('Detail:', error.details || 'No detail');
    } else {
      console.log('✅ Simulated Insertion SUCCEEDED:', data);
      
      // Clean up if it succeeded
      const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
      await supabaseAdmin.from('users').delete().eq('id', fakeId);
      console.log('Cleaned up test insertion.');
    }
  } catch (err: any) {
    console.error('Catch Error during insertion:', err.message || err);
  }
}

testUserInsertion();
