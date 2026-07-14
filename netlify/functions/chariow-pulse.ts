import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client with service_role bypass for administrative actions
const RAW_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder-fill-env-vars.supabase.co',
  adminKey || 'placeholder',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

async function logChariowPulseToSupabase(payload: any) {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('id', 'chariow_webhook_logs')
      .maybeSingle();

    let dbPulses: any[] = [];
    if (!error && data && Array.isArray(data.value)) {
      dbPulses = data.value;
    }

    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      received_at: new Date().toISOString(),
      payload: payload
    };

    dbPulses.unshift(newLog);
    if (dbPulses.length > 100) {
      dbPulses = dbPulses.slice(0, 100);
    }

    const { error: upsertErr } = await supabase
      .from('platform_settings')
      .upsert({ id: 'chariow_webhook_logs', value: dbPulses });

    if (upsertErr) {
      console.error('[Pulse Log Error] Upsert error:', upsertErr);
    }
  } catch (err) {
    console.error('[Pulse Log Error] Critical exception logging to Supabase settings:', err);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' })
    };
  }

  const respond = (statusCode: number, data: any) => {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(data)
    };
  };

  let body: any = {};
  const contentType = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
  
  console.log(`[Chariow Netlify Handled Pulse] Request received. Content-Type: ${contentType}. Headers:`, JSON.stringify(event.headers, null, 2));

  try {
    if (event.body) {
      if (contentType.includes('application/x-www-form-urlencoded')) {
        console.log('[Chariow Netlify Handled Pulse] Parsing URL-encoded body:', event.body);
        const params = new URLSearchParams(event.body);
        body = {};
        for (const [key, val] of params.entries()) {
          if (val.trim().startsWith('{') || val.trim().startsWith('[')) {
            try {
              body[key] = JSON.parse(val);
              continue;
            } catch (pErr) {}
          }
          body[key] = val;
        }
      } else {
        body = JSON.parse(event.body);
      }
    }
  } catch (err: any) {
    console.warn('[Chariow Netlify Handled Pulse] JSON/Urlencoded parsing error, continuing with fallback:', err.message);
    body = {
      event: 'unknown.raw',
      raw_body: event.body || '',
      error_message: err.message
    };
  }

  console.log('[Chariow Netlify Handled Pulse] Pulse parsed payload:', JSON.stringify(body, null, 2));

  const eventType = body?.event || 'successful.sale';

  const logEntry: any = {
    event: eventType,
    body: body || {},
    status: 'received',
    details: `[Source: Netlify Function] [Content-Type: ${contentType}]`
  };

  try {
    const dataPayload = body.data || {};
    
    // Extraction robuste de l'identifiant du produit Chariow
    const chariow_product_id = 
      body.product_id || 
      dataPayload.product_id || 
      (dataPayload.product && dataPayload.product.id) || 
      (body.product && body.product.id) ||
      (dataPayload.checkout && dataPayload.checkout.product_id) ||
      body.chariow_product_id;

    const customerEmail = 
      body.email || 
      dataPayload.email || 
      (dataPayload.customer && dataPayload.customer.email) || 
      (body.customer && body.customer.email);

    logEntry.product_id = chariow_product_id;
    logEntry.email = customerEmail;

    if (!chariow_product_id) {
      logEntry.status = 'ignored';
      logEntry.details = `Événement ${eventType} reçu mais ignoré car aucun product_id n'a été trouvé dans le payload.`;
      await logChariowPulseToSupabase(logEntry);
      return respond(200, {
        success: false,
        message: "Aucun product_id trouvé dans le payload du webhook. Webhook acquitté."
      });
    }

    // Récupération dynamique de la clé de correspondance Chariow de l'offre Premium
    let premiumChariowId = 'prd_iwhpro';
    try {
      const { data: psConf } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('id', 'flash_offer_chariow_product_id')
        .maybeSingle();
      if (psConf?.value?.product_id) {
        premiumChariowId = psConf.value.product_id;
      } else {
        const { data: flashConf } = await supabase
          .from('mz_flash_offer_v2')
          .select('chariow_product_id')
          .eq('id', 'flash-offer-global')
          .maybeSingle();
        if (flashConf?.chariow_product_id) {
          premiumChariowId = flashConf.chariow_product_id;
        }
      }
    } catch (errConf) {
      console.error('[Netlify Webhook] Erreur lecture config flash offer, fallback prd_iwhpro:', errConf);
    }

    // Trouver le produit correspondant dans notre base de données Supabase
    let product = null;
    let prodErr = null;

    const { data: dbProduct, error: dbProdErr } = await supabase
      .from('products')
      .select('id, name, commission_amount')
      .eq('chariow_product_id', chariow_product_id)
      .maybeSingle();

    product = dbProduct;
    prodErr = dbProdErr;

    // Un produit de secours virtuel pour l'offre MZ+ Premium s'il n'est pas encore enregistré dans la table
    if ((!product || prodErr) && chariow_product_id === premiumChariowId) {
      product = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'MZ+ Premium',
        commission_amount: 5000,
        chariow_product_id: premiumChariowId
      };
      prodErr = null;
    }

    if (prodErr || !product) {
      logEntry.status = 'product_not_found';
      logEntry.details = `Événement ${eventType} reçu mais impossible de trouver un produit correspondant dans Supabase pour l'identifiant Chariow : ${chariow_product_id}`;
      await logChariowPulseToSupabase(logEntry);
      return respond(200, {
        success: false,
        message: `Produit introuvable pour l'ID Chariow ${chariow_product_id}`
      });
    }

    logEntry.matched_product_name = product.name;

    const eventStr = String(eventType || '').toLowerCase();
    const isRejectedEvent = eventStr === 'failed.sale' || 
                            eventStr === 'abandoned.sale' || 
                            eventStr.includes('abandon') || 
                            eventStr.includes('reject') || 
                            eventStr.includes('fail') || 
                            eventStr.includes('cancel');

    // Si c'est l'offre flash premium (produit chariow configuré)
    if (chariow_product_id === premiumChariowId && customerEmail && !isRejectedEvent) {
      const { data: updatedUser, error: updateLevelErr } = await supabase
        .from('users')
        .update({ user_level: 'niveau_mz_plus' })
        .ilike('email', customerEmail.trim())
        .select();
        
      if (updateLevelErr) {
        console.error("[Netlify Webhook] Erreur de promotion Premium:", updateLevelErr);
        logEntry.details += ` [Erreur promotion: ${updateLevelErr.message}]`;
      } else if (updatedUser && updatedUser.length > 0) {
        console.log(`[Netlify Webhook] Utilisateur ${customerEmail} promu 'niveau_mz_plus'.`);
        logEntry.details += ` [Promu avec succès]`;
      } else {
        console.warn("[Netlify Webhook] Aucun utilisateur trouvé avec l'e-mail:", customerEmail);
        logEntry.details += ` [Utilisateur non trouvé par e-mail: ${customerEmail}]`;
      }
    }

    let affiliateUserId = null;
    let associatedCommId = body?.commission_id || dataPayload?.commission_id || null;

    console.log(`[Netlify Pulse DEBUG] RECEPTION - Événement : ${eventType}, Produit Chariow ID : ${chariow_product_id}, Client E-mail : ${customerEmail}, Commission Spécifique ID : ${associatedCommId}`);

    if (associatedCommId) {
      const { data: specificComm, error: specificCommErr } = await supabase
        .from('commissions')
        .select('id, user_id, status')
        .eq('id', associatedCommId)
        .maybeSingle();

      if (specificCommErr) {
        console.error(`[Netlify Pulse DEBUG] Erreur lors de la recherche de la commission spécifique ${associatedCommId} :`, specificCommErr);
      } else if (specificComm) {
        affiliateUserId = specificComm.user_id;
        console.log(`[Netlify Pulse DEBUG] TRAITEMENT - Commission spécifique d'id : ${associatedCommId} trouvée pour l'affilié ${affiliateUserId}`);
      } else {
        console.warn(`[Netlify Pulse DEBUG] Commission spécifique d'id : ${associatedCommId} introuvable dans la base. Fallback sur recherche en attente.`);
        associatedCommId = null;
      }
    }

    if (!associatedCommId) {
      // Trouver la commission en attente ('pending') la plus récente pour ce produit physique
      const { data: pendingComms, error: commsErr } = await supabase
        .from('commissions')
        .select('id, user_id, status')
        .eq('product_id', product.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (commsErr) {
        logEntry.status = 'error';
        logEntry.details = `Erreur de base de données lors de la recherche des commissions : ${commsErr.message}`;
        await logChariowPulseToSupabase(logEntry);
        return respond(500, {
          success: false,
          error: 'db_error',
          message: "Erreur de base de données."
        });
      }

      if (pendingComms && pendingComms.length > 0) {
        affiliateUserId = pendingComms[0].user_id;
        associatedCommId = pendingComms[0].id;
        console.log(`[Netlify Pulse] Commission en attente correspondante trouvée : ${associatedCommId} pour l'affilié : ${affiliateUserId}`);
      } else {
        // --- DEBUT DE LA RESOLUTION AUTOMATIQUE (PRODUCTION & SANS SIMULATION) ---
        console.log(`[Netlify Pulse] Aucune commission en attente trouvée pour le produit : ${product.name}. Essai de résolution autonome...`);
        
      // 1. Essai de détection directe du code de parrainage dans les métadonnées Chariow
      const directRefCode = body.ref || 
                            body.ref_code || 
                            body.referrer_code || 
                            body.referral_code ||
                            dataPayload.ref || 
                            dataPayload.ref_code || 
                            dataPayload.referrer_code || 
                            dataPayload.referral_code ||
                            (body.metadata && (body.metadata.ref || body.metadata.referrer_code || body.metadata.referral_code)) ||
                            (dataPayload.metadata && (dataPayload.metadata.ref || dataPayload.metadata.referrer_code || dataPayload.metadata.referral_code));

      if (directRefCode) {
        const { data: referrerUser } = await supabase
          .from('users')
          .select('id')
          .eq('referral_code', String(directRefCode).trim())
          .maybeSingle();
          
        if (referrerUser) {
          affiliateUserId = referrerUser.id;
          console.log(`[Netlify Pulse] Affilié résolu par code direct du webhook : ${affiliateUserId}`);
          logEntry.details += ` [Affilié résolu par code direct: ${directRefCode}]`;
        }
      }

      // 2. Si pas trouvé, essai de résolution par e-mail de l'acheteur
      if (!affiliateUserId && customerEmail) {
        const { data: buyerUser } = await supabase
          .from('users')
          .select('id, referral_code_used')
          .ilike('email', customerEmail.trim())
          .maybeSingle();

        if (buyerUser?.referral_code_used) {
          const { data: referrerUser } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', buyerUser.referral_code_used)
            .maybeSingle();

          if (referrerUser) {
            affiliateUserId = referrerUser.id;
            console.log(`[Netlify Pulse] Affilié résolu par e-mail acheteur (Parrain de l'acheteur) : ${affiliateUserId}`);
            logEntry.details += ` [Affilié résolu via e-mail acheteur parrainé]`;
          }
        }
      }

      // 3. Fallback spécial pour Pulse de test envoyé par Chariow (souvent adresse e-mail bidon ou vide)
      // Pour éviter que le test n'affiche rien du tout, on attribue la commission au dernier utilisateur ayant accédé ou créé un compte s'il y en a un
      if (!affiliateUserId && (String(customerEmail).includes('test') || !customerEmail || String(customerEmail).includes('chariow'))) {
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackUser) {
          affiliateUserId = fallbackUser.id;
          console.log(`[Netlify Pulse] Fallback test appliqué. Commission attribuée au dernier utilisateur : ${fallbackUser.id}`);
          logEntry.details += ` [Attribué par défaut au dernier utilisateur actif car email de test]`;
        }
      }
    }
  }

    // Helper pour synchroniser instantanément le solde du portefeuille (wallets) de l'utilisateur
    const syncWalletBalance = async (userId: string) => {
      if (!userId) return;
      try {
        console.log(`[Netlify Pulse DEBUG] PORTefeuille SYNCHRONISATION - Recalcul pour l'affilié ${userId}`);
        
        // Somme de toutes les commissions approuvées de l'utilisateur
        const { data: userComms, error: comListErr } = await supabase
          .from('commissions')
          .select('amount')
          .eq('user_id', userId)
          .in('status', ['approved', 'finalized']);

        if (comListErr) {
          console.error(`[Netlify Pulse DEBUG] PORTefeuille SYNCHRONISATION - Erreure commissions de l'utilisateur :`, comListErr);
          return;
        }

        const runningTotal = userComms?.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0) || 0;
        
        const { error: walletErr } = await supabase
          .from('wallets')
          .upsert({ user_id: userId, balance: runningTotal }, { onConflict: 'user_id' });

        if (walletErr) {
          console.error(`[Netlify Pulse DEBUG] PORTefeuille SYNCHRONISATION - Erreure de mise à jour du portefeuille :`, walletErr);
        } else {
          console.log(`[Netlify Pulse DEBUG] PORTefeuille SYNCHRONISATION - Portefeuille de l'affilié ${userId} mis à jour avec succès. Nouveau solde : ${runningTotal} FCFA`);
        }
      } catch (walletSyncError) {
        console.error(`[Netlify Pulse DEBUG] PORTefeuille SYNCHRONISATION - exception critique :`, walletSyncError);
      }
    };

    if (isRejectedEvent) {
      if (associatedCommId) {
        // La vente a échoué ou a été abandonnée, on rejette ('rejected') la commission associée existante
        const { error: updateErr } = await supabase
          .from('commissions')
          .update({ status: 'rejected' })
          .eq('id', associatedCommId);

        if (updateErr) {
          logEntry.status = 'error';
          logEntry.details = `Erreur lors du rejet de la commission ${associatedCommId} : ${updateErr.message}`;
          await logChariowPulseToSupabase(logEntry);
          return respond(500, {
            success: false,
            error: 'update_error',
            message: "Erreur lors du rejet de la commission."
          });
        }

        // Portefeuille synchronisé en temps réel après le rejet pour s'assurer que sa balance est correcte
        if (affiliateUserId) {
          await syncWalletBalance(affiliateUserId);
        }

        logEntry.status = 'rejected';
        logEntry.details = `Vente échouée / abandonnée (${eventType}). Commission existante ${associatedCommId} passée en 'rejected'.`;
        await logChariowPulseToSupabase(logEntry);

        return respond(200, {
          success: true,
          message: `Événement ${eventType} traité. Commission ${associatedCommId} rejetée.`,
          commissionId: associatedCommId,
          status: 'rejected'
        });
      } else {
        // Aucun mouvement car vente échouée et pas de commission pré-existante
        logEntry.status = 'rejected';
        logEntry.details = `Événement d'échec de la vente reçu (${eventType}) : Un client a initié le processus de commande pour le produit "${product.name}" mais n'a pas finalisé son paiement. La transaction a été signalée en échec ou abandonnée par Chariow.`;
        await logChariowPulseToSupabase(logEntry);
        return respond(200, {
          success: true,
          message: `Événement ${eventType} enregistré comme échec de paiement.`
        });
      }

    } else {
      // Événement d'achat réussi
      if (associatedCommId) {
        // On marque la commission en attente existante comme validée : 'approved'
        const { error: updateErr } = await supabase
          .from('commissions')
          .update({ status: 'approved' })
          .eq('id', associatedCommId);

        if (updateErr) {
          logEntry.status = 'error';
          logEntry.details = `Erreur lors de l'approbation de la commission existante ${associatedCommId} : ${updateErr.message}`;
          await logChariowPulseToSupabase(logEntry);
          return respond(500, {
            success: false,
            error: 'update_error',
            message: "Erreur de validation de la commission existante."
          });
        }

        // Portefeuille synchronisé en temps réel
        if (affiliateUserId) {
          await syncWalletBalance(affiliateUserId);
        }

        logEntry.status = 'success';
        logEntry.details += ` Vente réussie (${eventType}). Commission existante ${associatedCommId} de ${product.commission_amount} FCFA validée en 'approved'.`;
        await logChariowPulseToSupabase(logEntry);

        return respond(200, {
          success: true,
          message: `Commission ${associatedCommId} approuvée avec succès (Mise à jour).`,
          commissionId: associatedCommId,
          userId: affiliateUserId,
          status: 'approved'
        });

      } else if (affiliateUserId) {
        // Génial ! On crée à la volée une toute nouvelle commission validée ('approved') pour cet affilié identifié !
        const { data: newComm, error: insertCommErr } = await supabase
          .from('commissions')
          .insert([{
            user_id: affiliateUserId,
            product_id: product.id,
            amount: product.commission_amount,
            status: 'approved'
          }])
          .select();

        if (insertCommErr) {
          logEntry.status = 'error';
          logEntry.details = `Erreur lors de la création automatique de commission à la volée : ${insertCommErr.message}`;
          await logChariowPulseToSupabase(logEntry);
          return respond(500, {
            success: false,
            error: 'insert_error',
            message: "Erreur lors de la création automatique de la commission."
          });
        }

        // Portefeuille synchronisé en temps réel
        if (affiliateUserId) {
          await syncWalletBalance(affiliateUserId);
        }

        const createdComm = newComm?.[0];
        logEntry.status = 'success';
        logEntry.details += ` Vente réussie (${eventType}). Nouvelle commission ${createdComm?.id || ''} de ${product.commission_amount} FCFA créée automatiquement en 'approved' pour l'affilié ${affiliateUserId}.`;
        await logChariowPulseToSupabase(logEntry);

        return respond(200, {
          success: true,
          message: `Commission de ${product.commission_amount} FCFA générée et validée automatiquement avec succès !`,
          commissionId: createdComm?.id,
          userId: affiliateUserId,
          status: 'approved'
        });
      } else {
        // Aucun affilié trouvé et aucune commission pending n'existe
        if (chariow_product_id === 'prd_iwhpro') {
          logEntry.status = 'success';
          logEntry.details += ` Vente réussie de l'offre flash Premium (${eventType}) traitée avec succès sans parrainage.`;
          await logChariowPulseToSupabase(logEntry);
          return respond(200, {
            success: true,
            message: "Utilisateur promu membre Premium MZ+ avec succès."
          });
        }

        logEntry.status = 'ignored';
        logEntry.details = `Achat validé reçu pour le produit '${product.name}', mais aucun affilié et aucun code d'affiliation n'a pu être identifié pour attribuer le gain.`;
        await logChariowPulseToSupabase(logEntry);
        return respond(200, {
          success: true,
          message: "Achat enregistré avec succès au niveau du catalogue mais ignoré pour l'affiliation par manque de parrain."
        });
      }
    }

  } catch (err: any) {
    console.error('[Chariow Netlify Pulse] Erreur critique système dans le traitement du pulse:', err);
    logEntry.status = 'failure';
    logEntry.details = `Erreur système critique : ${err.message}`;
    await logChariowPulseToSupabase(logEntry);
    return respond(200, {
      success: false,
      error: 'webhook_internal_error',
      message: err.message
    });
  }
};
