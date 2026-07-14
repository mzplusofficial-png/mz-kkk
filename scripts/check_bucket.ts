import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function checkStorage() {
  console.log('--- Inspecting Supabase Storage Buckets ---');
  
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  
  if (error) {
    console.error('❌ Failed to list buckets:', error.message);
    return;
  }
  
  console.log('Available buckets:', buckets);
  
  const mzAssets = buckets.find(b => b.name === 'mz_assets');
  if (mzAssets) {
    console.log('✅ Bucket "mz_assets" exists!');
    console.log('Details:', JSON.stringify(mzAssets, null, 2));
    
    // Check if we can list files within the bucket
    console.log('Listing files in "sounds/" folder...');
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('mz_assets')
      .list('sounds', { limit: 10 });
      
    if (listError) {
      console.error('❌ Failed to list files inside "sounds/":', listError.message);
    } else {
      console.log(`✅ Succeeded listing "sounds/". Found ${files?.length || 0} files:`, files);
    }
  } else {
    console.log('❌ Bucket "mz_assets" DOES NOT exist in this Supabase project!');
  }
}

checkStorage();
