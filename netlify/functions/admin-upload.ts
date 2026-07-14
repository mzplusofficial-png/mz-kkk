import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, x-file-name, x-file-path',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

  try {
    const getHeader = (name: string): string | undefined => {
      const lower = name.toLowerCase();
      for (const key of Object.keys(event.headers)) {
        if (key.toLowerCase() === lower) {
          return event.headers[key];
        }
      }
      return undefined;
    };

    const filePath = getHeader('x-file-path') || '';
    const contentType = getHeader('content-type') || 'application/octet-stream';

    if (!filePath) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Chemin de fichier (x-file-path) manquant.' })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Corps du fichier vide.' })
      };
    }

    // Decode base64 encoded body if it was encoded by Netlify
    let fileBuffer: Buffer;
    if (event.isBase64Encoded) {
      fileBuffer = Buffer.from(event.body, 'base64');
    } else {
      fileBuffer = Buffer.from(event.body, 'utf-8');
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

    console.log(`[Netlify Upload Function] Uploading file to path: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('mz_assets')
      .upload(filePath, fileBuffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('[Netlify Upload Function] Supabase storage upload error:', uploadError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: uploadError.message })
      };
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('mz_assets')
      .getPublicUrl(filePath);

    console.log('[Netlify Upload Function] Public URL generated:', publicUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        publicUrl
      })
    };

  } catch (err: any) {
    console.error('[Netlify Upload Function] Exceptional error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Une erreur interne s’est produite.' })
    };
  }
};
