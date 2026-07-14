import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.VITE_SUPABASE_URL || '';
const url = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!url) {
  console.error("VITE_SUPABASE_URL is missing!");
  process.exit(1);
}

console.log("[Reset Script] Initializing Supabase with URL:", url);
const supabase = createClient(url, serviceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function runReset() {
  console.log("[Reset Script] Starting reset of monthly_xp and weekly_xp to 0 for all users...");
  
  // Update all users by matching any row where id is not null (guarantees matching all rows)
  const { data, error } = await supabase
    .from('users')
    .update({ 
      monthly_xp: 0,
      weekly_xp: 0,
      last_xp_update: new Date().toISOString()
    })
    .not('id', 'is', null)
    .select('id, email, full_name, monthly_xp, weekly_xp');

  if (error) {
    console.error("[Reset Script] Error resetting rankings:", error);
    process.exit(1);
  }

  console.log(`[Reset Script] Successfully reset rankings to 0 for ${data?.length || 0} users.`);
  if (data && data.length > 0) {
    console.log("[Reset Script] List of updated users preview (first 5):");
    console.log(data.slice(0, 5));
  }
}

runReset();
