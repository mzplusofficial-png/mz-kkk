import { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const initAdmin = () => {
  if (admin.apps.length) return admin;

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) {
    console.error('FCM: FIREBASE_SERVICE_ACCOUNT is missing!');
    return admin;
  }

  try {
    const serviceAccount = JSON.parse(saJson.trim());
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('FCM: Firebase Admin initialized successfully');
  } catch (e: any) {
    console.error('FCM: Error parsing FIREBASE_SERVICE_ACCOUNT:', e.message);
  }
  return admin;
};

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'OPTIONS, POST'
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
    const { productName, icon } = JSON.parse(event.body || '{}');

    if (!productName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Nom du produit manquant d’un paramètre.' })
      };
    }

    const adminInstance = initAdmin();
    if (!adminInstance.apps.length) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Le serveur de push Firebase n’est pas configuré.' })
      };
    }

    if (!SUPABASE_ANON_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "L'URL Supabase n'est pas configurée dans l'environnement Netlify." })
      };
    }

    const RAW_URL = process.env.VITE_SUPABASE_URL || '';
    const cleanUrl = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

    const supabase = createClient(cleanUrl, adminKey);
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('fcm_token')
      .not('fcm_token', 'is', null);

    if (fetchError) {
      console.error('[Netlify Broadcast-Product GET] DB Error:', fetchError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: fetchError.message })
      };
    }

    if (!users || users.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Aucun token FCM valide enregistré.' })
      };
    }

    const tokens = users.map(u => u.fcm_token as string).filter(Boolean);

    const title = 'Nouveau Service ! 🚀';
    const body = `Le service "${productName}" est maintenant disponible. Allez voir !`;

    const payloadBase = {
      notification: { title, body },
      data: { title, body, url: '/catalog', icon: icon || '/icon.png' },
      webpush: {
        notification: {
          title,
          body,
          icon: icon || '/icon.png',
          badge: icon || '/icon.png',
          click_action: '/catalog'
        },
        fcmOptions: {
          link: '/catalog'
        }
      }
    };

    const results = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);
      const response = await adminInstance.messaging().sendEach(chunk.map(t => ({ ...payloadBase, token: t })));
      results.push(response);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results })
    };
  } catch (err: any) {
    console.error('Broadcast product Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || 'Une erreur système s’est produite.' })
    };
  }
};
