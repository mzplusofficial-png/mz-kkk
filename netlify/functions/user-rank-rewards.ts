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

  // Extract userId from path if present (e.g., /api/user-rank-rewards/some-uuid)
  const pathParts = event.path.split('/').filter(Boolean);
  const rewardsIdx = pathParts.indexOf('user-rank-rewards');
  const userId = rewardsIdx !== -1 && pathParts[rewardsIdx + 1] ? pathParts[rewardsIdx + 1] : null;

  if (event.httpMethod === 'GET') {
    try {
      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID de l’utilisateur manquant dans l’URL.' })
        };
      }

      console.log(`[Netlify user-rank-rewards GET] Fetching rewards claims for user: ${userId}`);

      const { data, error } = await supabaseAdmin
        .from('user_rank_rewards')
        .select('*, reward:rank_rewards(*)')
        .eq('user_id', userId);

      if (error) {
        console.error(`[Netlify user-rank-rewards GET] DB Error:`, error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data || [])
      };
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const claimData = JSON.parse(event.body || '{}');
      console.log('[Netlify user-rank-rewards POST] Claim requested:', claimData);

      const { data, error } = await supabaseAdmin
        .from('user_rank_rewards')
        .insert([claimData])
        .select();

      if (error) {
        console.error('[Netlify user-rank-rewards POST] DB Error:', error);
        return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data ? data[0] : null)
      };
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Méthode non autorisée.' })
  };
};
