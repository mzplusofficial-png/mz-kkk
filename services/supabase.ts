
import { createClient } from '@supabase/supabase-js';
import { performanceAudit } from './performanceAudit';

// Get dynamic environment configuration if injected by the Express server
const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__[key]) {
    return (window as any).__ENV__[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  return '';
};

/**
 * Décode de manière sécurisée un jeton JWT de Supabase pour extraire l'utilisateur courant
 */
const decodeJwt = (token: string) => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    let decodedStr = '';
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      decodedStr = window.atob(payloadPart);
    } else if (typeof Buffer !== 'undefined') {
      decodedStr = Buffer.from(payloadPart, 'base64').toString('utf8');
    } else {
      return null;
    }
    return JSON.parse(decodedStr);
  } catch (e) {
    return null;
  }
};

/**
 * Assainit les entrées utilisateurs en nettoyant les patterns de requêtes SQL suspects.
 */
export const sanitizeInput = (val: any): any => {
  if (typeof val === 'string') {
    let cleaned = val;
    const sqlSuspectPatterns = [
      /--/g,                           // Commentaires SQL
      /drop\s+table/gi,                // DROP TABLE
      /delete\s+from/gi,              // DELETE FROM
      /union\s+select/gi,              // UNION SELECT
      /insert\s+into/gi,               // INSERT INTO
      /update\s+.*set/gi,              // UPDATE SET
    ];

    sqlSuspectPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '[SECURE]');
    });
    return cleaned;
  } else if (Array.isArray(val)) {
    return val.map(item => sanitizeInput(item));
  } else if (val !== null && typeof val === 'object') {
    const cleanedObj: Record<string, any> = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        cleanedObj[key] = sanitizeInput(val[key]);
      }
    }
    return cleanedObj;
  }
  return val;
};

/**
 * Vérifie si une chaîne de requête URL ou un corps de payload contient des patterns d'injection SQL suspects.
 */
export const validatePayloadForSqlInjection = (urlStr: string, bodyStr?: string): { isSuspicious: boolean; reason?: string } => {
  const decodedUrl = decodeURIComponent(urlStr).toLowerCase();
  const suspectKeywords = [
    'drop table', 
    'delete from', 
    'union select', 
    'insert into', 
    'pg_sleep', 
    'xp_cmdshell'
  ];

  for (const keyword of suspectKeywords) {
    if (decodedUrl.includes(keyword)) {
      return { isSuspicious: true, reason: `Commande SQL suspecte détectée: "${keyword}"` };
    }
  }

  // Vérification de caractères suspects combinés à des verbes SQL clés
  if (decodedUrl.includes('--') && (decodedUrl.includes('select') || decodedUrl.includes('update') || decodedUrl.includes('delete') || decodedUrl.includes('drop'))) {
    return { isSuspicious: true, reason: "Commentaire SQL '--' suspect détecté dans l'URL." };
  }

  if (decodedUrl.includes(';') && (decodedUrl.includes('select') || decodedUrl.includes('update') || decodedUrl.includes('delete') || decodedUrl.includes('drop'))) {
    return { isSuspicious: true, reason: "Séparateur de requête ';' suspect détecté dans l'URL." };
  }

  if (bodyStr) {
    const decodedBody = bodyStr.toLowerCase();
    for (const keyword of suspectKeywords) {
      if (decodedBody.includes(keyword)) {
        return { isSuspicious: true, reason: `Commande SQL suspecte détectée dans les données: "${keyword}"` };
      }
    }
    
    if (decodedBody.includes('--') && (decodedBody.includes('select') || decodedBody.includes('update') || decodedBody.includes('delete') || decodedBody.includes('drop'))) {
      return { isSuspicious: true, reason: "Commentaire SQL '--' suspect détecté dans les données." };
    }
    
    if (decodedBody.includes(';') && (decodedBody.includes('select') || decodedBody.includes('update') || decodedBody.includes('delete') || decodedBody.includes('drop'))) {
      return { isSuspicious: true, reason: "Séparateur ';' suspect détecté dans les données." };
    }
  }

  return { isSuspicious: false };
};

// Use environment variables exclusively
const customFetch = (url: URL | RequestInfo, options?: RequestInit): Promise<Response> => {
  const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
  const method = options?.method || 'GET';
  const headers = (options?.headers as Record<string, string>) || {};
  const body = options?.body;

  // 1. Assainir et valider les entrées contre les injections SQL (WAF de niveau applicatif)
  let bodyStr = '';
  if (body) {
    if (typeof body === 'string') {
      bodyStr = body;
    } else {
      try {
        bodyStr = JSON.stringify(body);
      } catch (e) {}
    }
  }

  const sqlCheck = validatePayloadForSqlInjection(urlStr, bodyStr);
  if (sqlCheck.isSuspicious) {
    console.error(`[Security Firewall] Requête bloquée : ${sqlCheck.reason}`);
    return Promise.resolve(new Response(JSON.stringify({
      error: "Requête suspecte bloquée",
      message: "L'activité a été détectée comme suspecte (tentative d'injection SQL)."
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // 2. Protection de la liste globale des utilisateurs (Contre le dump sauvage de données)
  const isUsersTableQuery = urlStr.includes('/rest/v1/users');
  if (isUsersTableQuery) {
    const authHeader = headers['Authorization'] || headers['authorization'] || '';
    let token = '';
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    const payload = decodeJwt(token);
    const userEmail = payload?.email ? payload.email.toLowerCase() : '';
    
    const AUTHORIZED_ADMIN_EMAILS = [
      'google@gmail.com', 
      'millionaireobject@gmail.com', 
      'mzplus1@gmail.com', 
      'utilisateur26@gmail.com', 
      'ivan1@gmail.com', 
      'mr.sahaivan@gmail.com',
      'mzplusofficial@gmail.com'
    ];
    
    const isUserAdmin = userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail);
    
    if (!isUserAdmin) {
      try {
        const urlObj = new URL(urlStr);
        const params = urlObj.searchParams;
        const selectParam = params.get('select') || '';
        
        // On vérifie s'il y a un filtre spécifique d'ID, d'email ou de code parrainage
        // pour autoriser la récupération légitime d'un profil individuel (ex: parrain ou boutique)
        const idFilter = params.get('id') || '';
        const referralFilter = params.get('referral_code') || '';
        const emailFilter = params.get('email') || '';
        
        const hasSpecificFilter = idFilter.startsWith('eq.') || referralFilter.startsWith('eq.') || emailFilter.startsWith('eq.');
        
        // Liste des colonnes sensibles interdites d'accès global en lecture
        const sensitiveColumns = ['email', 'phone', 'rpa_balance', 'rpa_points', 'fcm_token', 'admin_role', 'is_admin'];
        const requestsSensitiveData = sensitiveColumns.some(col => selectParam.toLowerCase().includes(col) || selectParam.includes('*'));
        
        // Si l'utilisateur essaie de lister sans filtre spécifique OU demande des données sensibles
        if (!hasSpecificFilter && requestsSensitiveData) {
          console.warn(`[Security Firewall] Blocage d'accès à la liste globale des utilisateurs pour: ${userEmail || 'Visiteur anonyme'}`);
          return Promise.resolve(new Response(JSON.stringify({
            error: "Accès refusé",
            message: "Vous n'êtes pas autorisé à lister les informations globales des utilisateurs."
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      } catch (e) {
        // En cas d'erreur, on bloque par précaution si ce n'est pas un admin
        return Promise.resolve(new Response(JSON.stringify({
          error: "Accès refusé",
          message: "Requête non autorisée."
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    }
  }

  // Global quota check simulation to satisfy Requirement 5
  if (typeof window !== 'undefined') {
    const isQuotaBlocked = localStorage.getItem('mz_quota_sim_blocked') === 'true';
    if (isQuotaBlocked && method.toUpperCase() === 'GET') {
      const isCriticalTable = urlStr.includes('/rest/v1/commissions') || 
                             urlStr.includes('/rest/v1/withdrawals') || 
                             urlStr.includes('/rest/v1/mz_user_store') || 
                             urlStr.includes('/rest/v1/rpa_submissions');

      if (isCriticalTable) {
        console.warn("[Quota Monitor] Requête bloquée en raison du dépassement de quota.");
        // Increment read count to show further violation activity
        const currentReads = parseInt(localStorage.getItem('mz_quota_sim_reads') || '0', 10);
        localStorage.setItem('mz_quota_sim_reads', (currentReads + 1).toString());
        
        return Promise.resolve(new Response(JSON.stringify({
          error: "Quota de lecture dépassé",
          message: "Quota de lecture dépassé. Accès bloqué pour l'utilisateur sur la table demandée.",
          hint: "Veuillez réinitialiser votre quota dans l'onglet 'Quotas & RLS' du panneau d'administration."
        }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    }
  }

  const fetchPromise = fetch(url, options);
  return performanceAudit.handleQueryIntercept(urlStr, method, headers, body, fetchPromise);
};

let supabaseInstance: any = null;

const getSupabaseInstance = () => {
  if (!supabaseInstance) {
    const RAW_URL = getEnvVar('VITE_SUPABASE_URL');
    const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

    if (!RAW_URL) {
      console.error("[Supabase Service] VITE_SUPABASE_URL env variable is missing or empty.");
    }
    if (!SUPABASE_ANON_KEY) {
      console.error("[Supabase Service] VITE_SUPABASE_ANON_KEY env variable is missing or empty.");
    }

    const SUPABASE_URL = (RAW_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

    supabaseInstance = createClient(
      SUPABASE_URL || 'https://placeholder-fill-env-vars.supabase.co', 
      SUPABASE_ANON_KEY || 'placeholder',
      {
        global: {
          fetch: customFetch
        }
      }
    );

    // Monkey-patch channel to track realtime subscriptions
    const originalChannel = supabaseInstance.channel;
    supabaseInstance.channel = function(this: any, name: string, options?: any) {
      performanceAudit.recordSubscription(name);
      return originalChannel.call(this, name, options);
    };
  }
  return supabaseInstance;
};

// Create a Proxy to transparently delegate properties and methods to the lazily initialized client
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const instance = getSupabaseInstance();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
  set(target, prop, value) {
    const instance = getSupabaseInstance();
    instance[prop] = value;
    return true;
  }
});

