import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const firebaseVapidKey = process.env.VITE_FIREBASE_VAPID_KEY || '';

  const body = `window.__ENV__ = {
  VITE_SUPABASE_URL: ${JSON.stringify(supabaseUrl)},
  VITE_SUPABASE_ANON_KEY: ${JSON.stringify(supabaseAnonKey)},
  VITE_FIREBASE_VAPID_KEY: ${JSON.stringify(firebaseVapidKey)}
};`;

  return {
    statusCode: 200,
    headers,
    body
  };
};
