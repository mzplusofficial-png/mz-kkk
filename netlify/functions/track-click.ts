import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' })
    };
  }

  const RAW_URL = process.env.VITE_SUPABASE_URL || '';
  if (!RAW_URL) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "L'URL Supabase n'est pas configurée dans l'environnement Netlify." })
    };
  }
  const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const { user_id, product_id } = JSON.parse(event.body || '{}');

    if (!user_id || !product_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'user_id et product_id requis.' })
      };
    }

    // Direct SELECT first to see if record exists
    const { data: existing, error: seekError } = await supabaseAdmin
      .from('product_stats')
      .select('*')
      .eq('user_id', user_id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (seekError) {
      throw seekError;
    }

    if (existing) {
      // Increment existing record clicks count
      const { error: updateError } = await supabaseAdmin
        .from('product_stats')
        .update({ clicks: (existing.clicks || 0) + 1 })
        .eq('user_id', user_id)
        .eq('product_id', product_id);

      if (updateError) throw updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabaseAdmin
        .from('product_stats')
        .insert({
          user_id,
          product_id,
          clicks: 1
        });

      if (insertError) throw insertError;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (err: any) {
    console.error('[Netlify track-click POST] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
