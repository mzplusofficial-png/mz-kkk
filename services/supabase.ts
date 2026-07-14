
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

// Use environment variables exclusively
const customFetch = (url: URL | RequestInfo, options?: RequestInit): Promise<Response> => {
  const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
  const method = options?.method || 'GET';
  const headers = (options?.headers as Record<string, string>) || {};
  const body = options?.body;

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

