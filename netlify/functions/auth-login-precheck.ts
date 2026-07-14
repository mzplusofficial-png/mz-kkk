import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' })
    };
  }

  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email et mot de passe requis' })
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Initialize Supabase admin client
    const RAW_URL = process.env.VITE_SUPABASE_URL || '';
    if (!RAW_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "L'URL Supabase (VITE_SUPABASE_URL) n'est pas configurée dans votre projet Netlify."
        })
      };
    }
    const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!adminKey || adminKey === '' || adminKey === 'undefined' || adminKey === 'null' || !adminKey.startsWith('eyJ')) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: "La clé d'API d'administration (SUPABASE_SERVICE_ROLE_KEY) n'est pas configurée ou invalide dans votre projet Netlify." 
        })
      };
    }

    const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`[Netlify Precheck & Migrate] Checking email: ${cleanEmail}`);

    // 1. Search in public.users to see if this email exists
    const { data: preExistingUserRaw, error: queryError } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    const preExistingUser: any = preExistingUserRaw;

    if (queryError) {
      console.error('[Netlify Precheck & Migrate] Error querying public.users:', queryError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erreur lors de la vérification de l\'existence du compte' })
      };
    }

    // Rule: if not found in public.users, return 401
    if (!preExistingUser) {
      console.log(`[Netlify Precheck & Migrate] Email not found in public.users: ${cleanEmail}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Email ou mot de passe incorrect.' })
      };
    }

    // 2. Search in auth.users via admin.listUsers
    let authUser: any = null;
    try {
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) {
        console.error('[Netlify Precheck & Migrate] Error listing auth users:', listErr);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erreur lors de la vérification de compte auth' })
        };
      } else {
        const users: any[] = listData?.users || [];
        authUser = users.find(u => u.email?.toLowerCase().trim() === cleanEmail);
      }
    } catch (authListException: any) {
      console.error('[Netlify Precheck & Migrate] Exception reading auth list:', authListException);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erreur technique d\'accès aux comptes' })
      };
    }

    if (authUser) {
      console.log(`[Netlify Precheck & Migrate] User already exists in auth.users: ${authUser.id}. Connexion directe.`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'ALREADY_MIGRATED',
          message: 'Utilisateur déjà enregistré dans GoTrue. Connexion directe sécurisée.'
        })
      };
    }

    // 3. User exists in public.users, but not in auth.users: Legacy user needs migration
    console.log(`[Netlify Precheck & Migrate] Legacy user detected! Checking legacy_passwords for: ${cleanEmail}`);

    const { data: legacyData, error: legacyErr } = await supabaseAdmin
      .from('legacy_passwords')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (legacyErr) {
      console.error('[Netlify Precheck & Migrate] Error checking legacy_passwords:', legacyErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erreur de base de données de transition.' })
      };
    }

    if (!legacyData) {
      console.log(`[Netlify Precheck & Migrate] No legacy_passwords entry for: ${cleanEmail}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Votre compte existe, mais aucun mot de passe de transition n\'est enregistré.' })
      };
    }

    if (!legacyData.encrypted_password) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Aucun mot de passe lié à ce compte de transition.' })
      };
    }

    // 4. Match password
    let isMatch = false;
    const storedHash = legacyData.encrypted_password.trim();

    if (storedHash.startsWith('$2')) {
      let normalizedHash = storedHash;
      if (storedHash.startsWith('$2y$')) {
        normalizedHash = '$2a$' + storedHash.substring(4);
      }
      try {
        isMatch = bcrypt.compareSync(cleanPassword, normalizedHash);
      } catch (bcryptErr) {
        console.error('[Netlify Precheck & Migrate] Bcrypt compare error:', bcryptErr);
        isMatch = false;
      }
    } else {
      isMatch = (cleanPassword === storedHash);
    }

    if (!isMatch) {
      console.warn(`[Netlify Precheck & Migrate] Password mismatch for: ${cleanEmail}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Email ou mot de passe incorrect.' })
      };
    }

    console.log(`[Netlify Precheck & Migrate] Password matched successfully! Provisioning auth.users and migrating...`);

    // 5. Create user in auth.users
    const { data: registerResult, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword, // Bakes the user's validated password into Supabase auth
      email_confirm: true,
      user_metadata: {
        full_name: preExistingUser.full_name || 'Ambassadeur',
        country: preExistingUser.country || '',
        referral_code_used: preExistingUser.referral_code_used || null
      }
    });

    if (signUpError) {
      console.error('[Netlify Precheck & Migrate] admin.createUser failed:', signUpError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Erreur d'enregistrement auth : ${signUpError.message}` })
      };
    }

    const newAuthId = registerResult.user?.id;
    if (newAuthId) {
      // 6. Inherit public.users stats & columns to new profile
      const mergedData = {
        full_name: preExistingUser.full_name || 'Ambassadeur',
        country: preExistingUser.country || null,
        country_code: preExistingUser.country_code || null,
        phone: preExistingUser.phone || null,
        username: preExistingUser.username || null,
        avatar_url: preExistingUser.avatar_url || null,
        is_admin: preExistingUser.is_admin || false,
        admin_role: preExistingUser.admin_role || null,
        user_level: preExistingUser.user_level || 'standard',
        referral_code: preExistingUser.referral_code || ('MZ' + Math.random().toString(36).substring(2, 8).toUpperCase()),
        referral_code_used: preExistingUser.referral_code_used || null,
        sponsor_id: preExistingUser.sponsor_id || null,
        xp: preExistingUser.xp || 0,
        weekly_xp: preExistingUser.weekly_xp || 0,
        monthly_xp: preExistingUser.monthly_xp || 0,
        rank_id: preExistingUser.rank_id || 1,
        rank_name: preExistingUser.rank_name || 'DÉBUTANT',
        fcm_token: preExistingUser.fcm_token || null,
        rpa_points: preExistingUser.rpa_points || 0,
        rpa_balance: preExistingUser.rpa_balance || 0,
        store_preferences: preExistingUser.store_preferences || {},
        has_seen_flash_offer: preExistingUser.has_seen_flash_offer || false,
        created_at: preExistingUser.created_at || new Date().toISOString()
      };

      // Check if profile exists (auto-created by DB triggers)
      const { data: newProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', newAuthId)
        .maybeSingle();

      if (!newProfile) {
        await supabaseAdmin.from('users').insert({
          id: newAuthId,
          email: cleanEmail,
          ...mergedData
        });
      } else {
        await supabaseAdmin.from('users').update(mergedData).eq('id', newAuthId);
      }

      // Migrate uniquely constrainted modules
      // Wallets
      try {
        const { data: oldWallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', preExistingUser.id).maybeSingle();
        const { data: newWallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', newAuthId).maybeSingle();
        if (oldWallet) {
          if (newWallet) {
            const combinedBalance = (parseFloat(oldWallet.balance?.toString() || '0')) + (parseFloat(newWallet.balance?.toString() || '0'));
            await supabaseAdmin.from('wallets').update({ balance: combinedBalance }).eq('id', newWallet.id);
            await supabaseAdmin.from('wallets').delete().eq('id', oldWallet.id);
          } else {
            await supabaseAdmin.from('wallets').update({ user_id: newAuthId }).eq('id', oldWallet.id);
          }
        }
      } catch (e) {
        console.warn('Wallet transfer warn:', e);
      }

      // Challenge States
      try {
        const { data: oldChallenge } = await supabaseAdmin.from('mz_challenge_3j_state').select('*').eq('user_id', preExistingUser.id).maybeSingle();
        const { data: newChallenge } = await supabaseAdmin.from('mz_challenge_3j_state').select('*').eq('user_id', newAuthId).maybeSingle();
        if (oldChallenge) {
          if (newChallenge) {
            await supabaseAdmin.from('mz_challenge_3j_state').delete().eq('user_id', newChallenge.user_id);
          }
          await supabaseAdmin.from('mz_challenge_3j_state').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
        }
      } catch (e) {
        console.warn('Challenge state transfer warn:', e);
      }

      // Streaks
      try {
        const { data: oldStreak } = await supabaseAdmin.from('user_activity_streaks').select('*').eq('user_id', preExistingUser.id).maybeSingle();
        const { data: newStreak } = await supabaseAdmin.from('user_activity_streaks').select('*').eq('user_id', newAuthId).maybeSingle();
        if (oldStreak) {
          if (newStreak) {
            await supabaseAdmin.from('user_activity_streaks').delete().eq('user_id', newStreak.user_id);
          }
          await supabaseAdmin.from('user_activity_streaks').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
        }
      } catch (e) {
        console.warn('Streak transfer warn:', e);
      }

      // Welcome popups
      try {
        const { data: oldWelcome } = await supabaseAdmin.from('premium_welcome_popups').select('*').eq('user_id', preExistingUser.id).maybeSingle();
        const { data: newWelcome } = await supabaseAdmin.from('premium_welcome_popups').select('*').eq('user_id', newAuthId).maybeSingle();
        if (oldWelcome) {
          if (newWelcome) {
            await supabaseAdmin.from('premium_welcome_popups').delete().eq('user_id', newWelcome.user_id);
          }
          await supabaseAdmin.from('premium_welcome_popups').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
        }
      } catch (e) {
        console.warn('Welcome popup transfer warn:', e);
      }

      // Other associations
      try {
        await Promise.allSettled([
          supabaseAdmin.from('commissions').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
          supabaseAdmin.from('mz_rewards_time_tracking').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
          supabaseAdmin.from('mz_background_notifications_log').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
          supabaseAdmin.from('user_rank_rewards').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
          supabaseAdmin.from('mz_offer_page_tracking').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
          supabaseAdmin.from('product_stats').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id)
        ]);
      } catch (e) {
        console.warn('Data references migration warn:', e);
      }

      // Clean old CSV imported profile row
      await supabaseAdmin.from('users').delete().eq('id', preExistingUser.id);

      // Redact legacy password
      await supabaseAdmin
        .from('legacy_passwords')
        .update({
          migrated: true,
          migrated_at: new Date().toISOString(),
          encrypted_password: 'MIGRATED'
        })
        .eq('id', legacyData.id);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Migration et liaison de compte terminées avec succès.'
      })
    };

  } catch (err: any) {
    console.error('[Netlify Precheck & Migrate] Exceptional crash:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Une erreur interne s’est produite lors de la migration.' })
    };
  }
};
