import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function findAdmins() {
  console.log('--- Scanning for Users with is_admin = true ---');
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, is_admin, admin_role, user_level');
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  const admins = data.filter(u => u.is_admin);
  console.log(`Total users in DB: ${data.length}`);
  console.log(`Admin users in DB (${admins.length}):`);
  console.log(JSON.stringify(admins, null, 2));
}

findAdmins();
