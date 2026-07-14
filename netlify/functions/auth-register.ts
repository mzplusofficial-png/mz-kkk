import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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
    const { email, password, name, country, referralCode, phone } = JSON.parse(event.body || '{}');

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
          error: "L'URL Supabase (VITE_SUPABASE_URL) n'est pas configurée dans les paramètres d'environnement de votre projet Netlify."
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
          error: "La clé d'API d'administration (SUPABASE_SERVICE_ROLE_KEY) n'est pas configurée correctement dans votre projet Netlify, ou n'est pas un jeton JWT valide (elle doit commencer par 'eyJ'). Veuillez vous connecter à votre tableau de bord Netlify, aller dans l'onglet des variables d'environnement de votre site, et ajouter 'SUPABASE_SERVICE_ROLE_KEY' (votre clé secrète service_role Supabase)." 
        })
      };
    }

    const supabaseAdmin = createClient(SUPABASE_URL, adminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`[Netlify Auth Function] Attempting to register email: ${cleanEmail}`);

    // 1. Check if user already exists in public.users (i.e. was imported via CSV)
    let preExistingUser = null;
    try {
      const { data: userRecord, error: queryError } = await supabaseAdmin
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (queryError) {
        console.error('[Netlify Auth Function] Error querying prior public.users data:', queryError);
        // Catch egress quota error
        if (queryError.message?.toLowerCase().includes('egress_quota') || queryError.message?.toLowerCase().includes('restricted')) {
          return {
            statusCode: 402,
            headers,
            body: JSON.stringify({
              error: "Le service de base de données Supabase a suspendu l'accès à ce projet car le quota gratuit d'export de données (egress_quota) a été dépassé. Le propriétaire du projet doit se connecter sur supabase.com pour lever les limites de dépenses (spend caps) ou passer à une formule payante."
            })
          };
        }
      }
      preExistingUser = userRecord;
    } catch (queryErr: any) {
      console.error('[Netlify Auth Function] Error executing query:', queryErr);
      if (queryErr.message?.toLowerCase().includes('egress_quota') || queryErr.message?.toLowerCase().includes('restricted')) {
        return {
          statusCode: 402,
          headers,
          body: JSON.stringify({
            error: "Le service de base de données Supabase a suspendu l'accès à ce projet car le quota gratuit d'export de données (egress_quota) a été dépassé. Le propriétaire du projet doit se connecter sur supabase.com pour lever les limites de dépenses (spend caps) ou passer à une formule payante."
          })
        };
      }
    }

    let authUser;

    if (preExistingUser) {
      console.log(`[Netlify Auth Function] Found pre-existing imported user with ID: ${preExistingUser.id}`);

      // We DO NOT specify preExistingUser.id directly in admin.createUser,
      // because that fires the database trigger which attempts to insert that same ID,
      // causing primary key / unique constraint conflict error.
      // Instead, we let GoTrue generate a clean, brand new UUID, wait for the trigger
      // to safely insert the profile row, copy over the stats, update ALL references (foreign keys)
      // pointing to the old UUID to point to the new UUID instead, and then safely delete the old UUID.
      const { data: registerResult, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name || preExistingUser.full_name || 'Ambassadeur',
          country: country || preExistingUser.country || '',
          phone: phone || preExistingUser.phone || '',
          referral_code_used: referralCode || preExistingUser.referral_code_used || null
        }
      });

      if (signUpError) {
        console.error('[Netlify Auth Function] admin.createUser failed during migration:', signUpError);
        const msg = signUpError.message?.toLowerCase() || '';
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('conflict')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Cet email est déjà lié à un compte MZ+. Veuillez vous connecter avec vos accès.' })
          };
        }
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: signUpError.message || "Erreur lors de la création d'accès authentifiés." })
        };
      }

      authUser = registerResult.user;
      const newAuthId = authUser?.id;
      console.log(`[Netlify Auth Function] Created migrated auth user. New ID: ${newAuthId}. Re-linking all tables and merging stats...`);

      if (newAuthId) {
        // 1. Fetch or create the new profile row
        const { data: newProfile } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', newAuthId)
          .maybeSingle();

        const mergedData = {
          full_name: name || preExistingUser.full_name || 'Ambassadeur',
          country: country || preExistingUser.country || null,
          country_code: preExistingUser.country_code || null,
          phone: phone || preExistingUser.phone || null,
          username: preExistingUser.username || null,
          avatar_url: preExistingUser.avatar_url || null,
          is_admin: preExistingUser.is_admin || false,
          admin_role: preExistingUser.admin_role || null,
          user_level: preExistingUser.user_level || 'standard',
          referral_code: preExistingUser.referral_code || ('MZ' + Math.random().toString(36).substring(2, 8).toUpperCase()),
          referral_code_used: referralCode || preExistingUser.referral_code_used || null,
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

        if (!newProfile) {
          console.log('[Netlify Auth Function] New profile row missing, inserting manually before migration...');
          await supabaseAdmin.from('users').insert({
            id: newAuthId,
            email: cleanEmail,
            ...mergedData
          });
        } else {
          console.log('[Netlify Auth Function] New profile row auto-created, merging and patching data...');
          await supabaseAdmin.from('users').update(mergedData).eq('id', newAuthId);
        }

        // 2. Safe unique-constraint table migration (so we don't encounter unique key crashes on update/delete)
        // A: Wallets table
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
        } catch (walletErr) {
          console.warn('[Netlify Auth Function] Wallets transfer warning:', walletErr);
        }

        // B: Challenge 3J State
        try {
          const { data: oldChallenge } = await supabaseAdmin.from('mz_challenge_3j_state').select('*').eq('user_id', preExistingUser.id).maybeSingle();
          const { data: newChallenge } = await supabaseAdmin.from('mz_challenge_3j_state').select('*').eq('user_id', newAuthId).maybeSingle();
          if (oldChallenge) {
            if (newChallenge) {
              await supabaseAdmin.from('mz_challenge_3j_state').delete().eq('user_id', newChallenge.user_id);
            }
            await supabaseAdmin.from('mz_challenge_3j_state').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
          }
        } catch (challengeErr) {
          console.warn('[Netlify Auth Function] Challenge state transfer warning:', challengeErr);
        }

        // C: Streaks Table
        try {
          const { data: oldStreak } = await supabaseAdmin.from('user_activity_streaks').select('*').eq('user_id', preExistingUser.id).maybeSingle();
          const { data: newStreak } = await supabaseAdmin.from('user_activity_streaks').select('*').eq('user_id', newAuthId).maybeSingle();
          if (oldStreak) {
            if (newStreak) {
              await supabaseAdmin.from('user_activity_streaks').delete().eq('user_id', newStreak.user_id);
            }
              await supabaseAdmin.from('user_activity_streaks').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
          }
        } catch (streakErr) {
          console.warn('[Netlify Auth Function] Streaks transfer warning:', streakErr);
        }

        // D: Welcome Popups
        try {
          const { data: oldWelcome } = await supabaseAdmin.from('premium_welcome_popups').select('*').eq('user_id', preExistingUser.id).maybeSingle();
          const { data: newWelcome } = await supabaseAdmin.from('premium_welcome_popups').select('*').eq('user_id', newAuthId).maybeSingle();
          if (oldWelcome) {
            if (newWelcome) {
              await supabaseAdmin.from('premium_welcome_popups').delete().eq('user_id', newWelcome.user_id);
            }
            await supabaseAdmin.from('premium_welcome_popups').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id);
          }
        } catch (welcomeErr) {
          console.warn('[Netlify Auth Function] Welcome popups transfer warning:', welcomeErr);
        }

        // 3. Migrate all other non-unique tables
        try {
          await Promise.allSettled([
            supabaseAdmin.from('commissions').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('mz_rewards_time_tracking').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('mz_background_notifications_log').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('user_rank_rewards').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('mz_offer_page_tracking').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id),
            supabaseAdmin.from('product_stats').update({ user_id: newAuthId }).eq('user_id', preExistingUser.id)
          ]);
          console.log('[Netlify Auth Function] Finished migrating sub-reference records.');
        } catch (relErr) {
          console.warn('[Netlify Auth Function] Relational update warn:', relErr);
        }

        // 4. Safely delete the old imported record from public.users
        const { error: delErr } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', preExistingUser.id);

        if (delErr) {
          console.error('[Netlify Auth Function] Error deleting old stale imported user record:', delErr);
        } else {
          console.log(`[Netlify Auth Function] Cleaned stale imported user record with ID ${preExistingUser.id}`);
        }
      }
    } else {
      console.log(`[Netlify Auth Function] Creating brand new user: ${cleanEmail}`);

      // Try creating standard brand new user
      const { data: registerResult, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          country: country,
          phone: phone || '',
          referral_code_used: referralCode || null
        }
      });

      if (signUpError) {
        console.error('[Netlify Auth Function] admin.createUser failed for new user:', signUpError);
        if (signUpError.message?.toLowerCase().includes('already registered') || 
            signUpError.message?.toLowerCase().includes('already exists') ||
            signUpError.message?.toLowerCase().includes('conflict')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Cet email est déjà lié à un compte MZ+. Veuillez vous connecter.' })
          };
        }
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: signUpError.message })
        };
      }

      authUser = registerResult.user;

      // Manually insert into public.users to ensure consistency (since there may be no auto trigger)
      if (authUser) {
        const { data: existingProf } = await supabaseAdmin.from('users').select('id').eq('id', authUser.id).maybeSingle();
        if (!existingProf) {
          const generatedCode = 'MZ' + Math.random().toString(36).substring(2, 8).toUpperCase();
          const { error: insertErr } = await supabaseAdmin.from('users').insert({
            id: authUser.id,
            email: cleanEmail,
            full_name: name,
            country: country,
            phone: phone || null,
            referral_code: generatedCode,
            referral_code_used: referralCode || null,
            rank_id: 1,
            user_level: 'standard',
            rpa_points: 0,
            rpa_balance: 0
          });

          if (insertErr) {
            console.error('[Netlify Auth Function] Failed to manually create user record in public.users:', insertErr);
          } else {
            console.log(`[Netlify Auth Function] Successfully inserted record into public.users for: ${cleanEmail}`);
          }
        } else {
          console.log(`[Netlify Auth Function] Profile was already auto-created by database trigger for: ${cleanEmail}. Patching with correct registration metadata (phone, full_name, country)...`);
          const { error: patchErr } = await supabaseAdmin.from('users').update({
            full_name: name,
            country: country,
            phone: phone || null,
            referral_code_used: referralCode || null
          }).eq('id', authUser.id);
          
          if (patchErr) {
            console.error('[Netlify Auth Function] Failed to patch auto-created trigger profile with correct registration details:', patchErr.message);
          } else {
            console.log('[Netlify Auth Function] Succeeded in patching auto-created trigger profile with complete registration details (including phone).');
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Compte créé et activé avec succès !',
        userId: authUser?.id
      })
    };

  } catch (err: any) {
    console.error('[Netlify Auth Function] Exceptional crash:', err);
    const msg = err.message || '';
    if (msg.toLowerCase().includes('egress_quota') || msg.toLowerCase().includes('restricted') || msg.toLowerCase().includes('supabasekey is required')) {
      return {
        statusCode: 402,
        headers,
        body: JSON.stringify({ 
          error: msg.includes('supabaseKey is required') 
            ? "Erreur technique : La clé d'API d'administration (SUPABASE_SERVICE_ROLE_KEY) n'est pas configurée ou est incorrecte dans votre projet Netlify. Veuillez l'ajouter dans les variables d'environnement de votre site."
            : "Le service de base de données Supabase a restreint l'accès suite à un dépassement du quota gratuit de transfert de données (egress_quota). Le propriétaire du projet (millionaireobject@gmail.com) doit débloquer le service en mettant à niveau son offre ou en ajustant les limites de dépenses sur le tableau de bord Supabase (https://supabase.com/)." 
        })
      };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Une erreur interne inattendue s’est produite.' })
    };
  }
};
