import { createClient } from '@supabase/supabase-js';

const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testSoundRLS() {
  console.log('--- Testing RLS Policies for mz_sound_effects Table ---');
  
  const testCategory = 'reward_appear';
  const testUrl = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
  
  const { data, error } = await supabaseAnon
    .from('mz_sound_effects')
    .upsert({ category: testCategory, url: testUrl }, { onConflict: 'category' })
    .select('*');

  if (error) {
    console.error(`❌ Client-side write to mz_sound_effects FAILED: ${error.code} - ${error.message}`);
    console.log('Detail:', error.details || 'No detail');
  } else {
    console.log('✅ Client-side write to mz_sound_effects SUCCEEDED:', data);
  }
}

testSoundRLS();
