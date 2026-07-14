import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
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

  // Extract ID from path if present (e.g., /api/rank-rewards/123)
  const pathParts = event.path.split('/').filter(Boolean);
  const rewardIdx = pathParts.indexOf('rank-rewards');
  const id = rewardIdx !== -1 && pathParts[rewardIdx + 1] ? pathParts[rewardIdx + 1] : null;

  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('rank_rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Netlify rank-rewards GET] DB Error:', error);
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
      const editForm = JSON.parse(event.body || '{}');
      if (editForm.id) {
        // Update operation
        console.log(`[Netlify rank-rewards POST] Update requested for ID: ${editForm.id}`);
        const { created_at, ...updateData } = editForm;
        const { data, error } = await supabaseAdmin
          .from('rank_rewards')
          .update(updateData)
          .eq('id', editForm.id)
          .select();

        if (error) {
          console.error('[Netlify rank-rewards POST/update] Error:', error);
          return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data ? data[0] : null)
        };
      } else {
        // Insert operation
        console.log('[Netlify rank-rewards POST] Insert requested');
        const { data, error } = await supabaseAdmin
          .from('rank_rewards')
          .insert([editForm])
          .select();

        if (error) {
          console.error('[Netlify rank-rewards POST/insert] Error:', error);
          return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data ? data[0] : null)
        };
      }
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === 'DELETE') {
    try {
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID de récompense manquant pour la suppression.' })
        };
      }

      console.log(`[Netlify rank-rewards DELETE] Deleting reward ID: ${id}`);

      // 1. Delete associated user_rank_rewards first
      await supabaseAdmin.from('user_rank_rewards').delete().eq('reward_id', id);

      // 2. Delete the reward itself
      const { error } = await supabaseAdmin
        .from('rank_rewards')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Netlify rank-rewards DELETE] DB Error:', error);
        return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
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
