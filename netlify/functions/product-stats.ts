import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez GET.' })
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
    const user_id = event.queryStringParameters?.user_id;

    if (!user_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'user_id requis.' })
      };
    }

    const { data, error } = await supabaseAdmin
      .from('product_stats')
      .select('product_id, clicks')
      .eq('user_id', user_id);

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: data || [] })
    };
  } catch (err: any) {
    console.error('[Netlify product-stats GET] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
