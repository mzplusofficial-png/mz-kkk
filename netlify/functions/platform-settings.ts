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
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const pathParts = event.path.split('/').filter(Boolean);
  let settingId = 'store_customization';
  const psIndex = pathParts.indexOf('platform-settings');
  if (psIndex !== -1 && pathParts[psIndex + 1]) {
    settingId = pathParts[psIndex + 1];
  } else if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== 'platform-settings') {
      settingId = lastPart;
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .select('value')
        .eq('id', settingId)
        .maybeSingle();

      if (error) {
        console.warn(`[Netlify Platform-Settings GET] Supabase read failed/missing table for ${settingId}, returning fallback:`, error.message);
        if (settingId === 'store_customization') {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, enabled: true })
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, value: null })
        };
      }

      if (settingId === 'store_customization') {
        const val = data?.value as any;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, enabled: !val || val.enabled !== false })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, value: data?.value || null })
      };
    } catch (err: any) {
      console.warn(`[Netlify Platform-Settings GET] Exception for ${settingId}, returning default fallback:`, err.message);
      if (settingId === 'store_customization') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, enabled: true })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, value: null })
      };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      let bodyData = JSON.parse(event.body || '{}');
      let valToSave: any;

      if (settingId === 'store_customization') {
        const { enabled } = bodyData;
        valToSave = { enabled: enabled !== false };
      } else {
        valToSave = bodyData.value;
      }

      const { error } = await supabaseAdmin
        .from('platform_settings')
        .upsert({ id: settingId, value: valToSave });

      if (error) {
        console.error(`[Netlify Platform-Settings POST] DB upsert failed for ${settingId}:`, error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }

      if (settingId === 'store_customization') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, enabled: valToSave.enabled })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, value: valToSave })
      };
    } catch (err: any) {
      console.error(`[Netlify Platform-Settings POST] Exception for ${settingId}:`, err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: err.message || 'Une erreur système s’est produite.' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Méthode non autorisée.' })
  };
};
