import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase.ts';
import { 
  Loader2, Store, Save, RefreshCw, Trash2, Activity, 
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, 
  Search, Eye, Database, Info, Settings, Clock, Check
} from 'lucide-react';
import { SectionTitle, GoldBorderCard, PrimaryButton } from '../../UI.tsx';

interface WebhookLog {
  id: string;
  received_at: string;
  payload: {
    event: string;
    product_id?: string;
    email?: string;
    status: 'success' | 'no_pending_commission' | 'product_not_found' | 'error' | 'failure' | 'ignored';
    details: string;
    matched_product_name?: string;
    body: any;
  };
}

export const AdminStoreSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Webhooks log states
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Simulateur de Pulse Chariow (Côté client pour contourner le par-feu)
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [simProduct, setSimProduct] = useState<string>('');
  const [simEmail, setSimEmail] = useState<string>('');
  const [simEvent, setSimEvent] = useState<string>('successful.sale');
  const [simSending, setSimSending] = useState(false);
  const [simResult, setSimResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchWebhookLogs();
    fetchProducts();

    // Actualisation automatique des logs webhook toutes les 5 secondes
    const interval = setInterval(() => {
      fetchWebhookLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error: prodErr } = await supabase
        .from('products')
        .select('id, name, chariow_product_id, commission_amount')
        .order('name');
      if (!prodErr && data) {
        setDbProducts(data);
        // Choisir l'offre premium par défaut s'il existe, ou le premier produit
        const premiumOpt = data.find(p => p.chariow_product_id === 'prd_iwhpro');
        if (premiumOpt) {
          setSimProduct('prd_iwhpro');
        } else if (data.length > 0) {
          setSimProduct(data[0].chariow_product_id || data[0].id);
        }
      }
    } catch (e) {
      console.error("Error fetching products for simulator:", e);
    }
  };

  const handleSimulatePulse = async () => {
    if (!simProduct) {
      setSimResult({ success: false, message: "Veuillez sélectionner un produit ou spécifier un identifiant Chariow." });
      return;
    }
    if (!simEmail) {
      setSimResult({ success: false, message: "Veuillez renseigner l'adresse e-mail du client acquéreur." });
      return;
    }

    try {
      setSimSending(true);
      setSimResult(null);

      const payload = {
        event: simEvent,
        product_id: simProduct,
        email: simEmail,
        data: {
          product_id: simProduct,
          email: simEmail,
          product: {
            id: simProduct
          },
          customer: {
            email: simEmail
          }
        }
      };

      const res = await fetch('/api/chariow/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        setSimResult({ 
          success: true, 
          message: json.message || "Signal simulé et traité par le serveur avec succès !" 
        });
        // Rafraîchir l'historique des webhooks pour voir le signal en haut de liste
        fetchWebhookLogs();
      } else {
        setSimResult({ 
          success: false, 
          message: json.message || "Le serveur a traité l'appel mais a retourné un échec de validation." 
        });
      }
    } catch (err: any) {
      console.error("Error simulating webhook:", err);
      setSimResult({ success: false, message: `Impossible de joindre le serveur : ${err.message}` });
    } finally {
      setSimSending(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/platform-settings/store_customization');
      const json = await res.json();
      if (json.success) {
        setEnabled(json.enabled !== false);
      } else {
        throw new Error(json.error || "Impossible de récupérer les paramètres");
      }
    } catch (err: any) {
      console.error("Error fetching store settings:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      setLoadingLogs(true);
      setLogsError(null);
      const res = await fetch('/api/chariow/webhook-logs');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
      } else {
        throw new Error(json.error || "Impossible de récupérer les logs");
      }
    } catch (err: any) {
      console.error("Error fetching webhook logs:", err);
      setLogsError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const clearWebhookLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/chariow/webhook-logs/clear', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setLogs([]);
        setConfirmClear(false);
      } else {
        throw new Error(json.error || "Impossible de vider les logs");
      }
    } catch (err: any) {
      console.error("Error clearing logs:", err);
      setLogsError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const res = await fetch('/api/platform-settings/store_customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Une erreur est survenue lors de l'enregistrement");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving store settings:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const s = logSearch.toLowerCase();
    const payload = log.payload as any;
    return (
      (payload.event || '').toLowerCase().includes(s) ||
      (payload.email || '').toLowerCase().includes(s) ||
      (payload.product_id || '').toLowerCase().includes(s) ||
      (payload.matched_product_name || '').toLowerCase().includes(s) ||
      (payload.status || '').toLowerCase().includes(s) ||
      (payload.details || '').toLowerCase().includes(s)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Succès (Finalisé)
          </span>
        );
      case 'no_pending_commission':
        return (
          <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Sans commission active
          </span>
        );
      case 'product_not_found':
        return (
          <span className="px-2 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[8px] font-black uppercase rounded-lg flex items-center gap-1">
            <AlertTriangle size={10} /> Produit non reconnu
          </span>
        );
      case 'ignored':
        return (
          <span className="px-2 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 text-[8px] font-black uppercase rounded-lg">
            Ignoré / Incomplet
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase rounded-lg flex items-center gap-1">
            <AlertTriangle size={10} className="text-red-400" /> Échec / Abandonné
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase rounded-lg flex items-center gap-1">
            <AlertTriangle size={10} /> Erreur
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-12">
      <SectionTitle 
        title="Paramètres & Suivi Chariow" 
        subtitle="Contrôlez la personnalisation globale de la boutique et observez les ventes de votre réseau en direct." 
      />

      {/* PARAMETRES DE LA BOUTIQUE */}
      <GoldBorderCard className="p-8 bg-black/40 border-orange-500/20">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500 shrink-0">
            <Store size={24} />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-lg font-black uppercase text-white mb-2">Options de personnalisation</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Si cette option est désactivée, les utilisateurs ne pourront plus voir les paramètres de personnalisation de leur boutique (thème, nom, couleur). L'icône de statistiques s'affichera directement à la place.
              </p>
            </div>

            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={enabled} 
                  onChange={(e) => setEnabled(e.target.checked)} 
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-orange-500' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-orange-400 transition-colors">
                Autoriser la personnalisation des boutiques
              </span>
            </label>

            {error && (
              <p className="text-xs text-red-500 font-bold uppercase">{error}</p>
            )}

            {success && (
              <p className="text-xs text-emerald-500 font-bold uppercase">Sauvegardé avec succès !</p>
            )}

            <div>
              <PrimaryButton onClick={handleSave} isLoading={saving} className="bg-orange-600 hover:bg-orange-500 text-white">
                <Save size={16} /> Enregistrer les paramètres
              </PrimaryButton>
            </div>
          </div>
        </div>
      </GoldBorderCard>

      {/* MONITEUR DE SUIVI DES VENTES */}
      <GoldBorderCard className="p-8 bg-black/40 border-yellow-500/20">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
            <div className="flex items-start gap-4">
              <div className="p-4 bg-yellow-500/10 rounded-2xl text-yellow-500 shrink-0">
                <Activity size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                  Suivi des Ventes Automatiques <span className="px-2 py-0.5 bg-yellow-500 text-black rounded text-[8px] font-black uppercase">Temps Réel</span>
                </h3>
                <p className="text-xs text-white/50 leading-relaxed mt-1">
                  Historique de réception des commandes et transactions. Un statut vert indique que le paiement a fonctionné et que vos gains sont confirmés.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={fetchWebhookLogs}
                disabled={loadingLogs}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
              >
                {loadingLogs ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Rafraîchir
              </button>

              {logs.length > 0 && (
                confirmClear ? (
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={clearWebhookLogs}
                      className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl"
                    >
                      Confirmer vider
                    </button>
                    <button 
                      onClick={() => setConfirmClear(false)}
                      className="px-3 py-2 bg-white/5 text-neutral-400 text-[9px] font-bold uppercase rounded-xl"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmClear(true)}
                    className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 size={12} /> Réinitialiser logs
                  </button>
                )
              )}
            </div>
          </div>

          {/* Bar de recherche */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text"
              placeholder="Rechercher par email client, ID produit Chariow, événement, statut..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-xs text-white placeholder-neutral-500 focus:border-yellow-500 transition-colors outline-none"
            />
          </div>

          {logsError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold uppercase text-center flex items-center justify-center gap-2">
              <AlertTriangle size={14} /> Impossible d'importer l'historique : {logsError}
            </div>
          )}

          {/* SIMULATEUR DE COMPORTEMENT CLIENT (SIMPLIFIÉ POUR L'UTILISATEUR) */}
          <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 space-y-5">
            <div>
              <h4 className="text-[13px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-orange-400" /> Simulateur instantané de validation de vente
              </h4>
              <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                Les serveurs externes de paiement ne peuvent pas franchir la barrière de sécurité de cet espace de démonstration privé. Utilisez ce simulateur pour valider artificiellement une transaction et observer les gains en temps réel.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Étape 1 : Produit */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-widest block">1. Produit acheté</label>
                <select
                  value={simProduct}
                  onChange={(e) => setSimProduct(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white uppercase font-bold outline-none focus:border-orange-500"
                >
                  <option value="prd_iwhpro">MZ+ PREMIUM OPTION (prd_iwhpro)</option>
                  {dbProducts.filter(p => p.chariow_product_id !== 'prd_iwhpro').map(p => (
                    <option key={p.id} value={p.chariow_product_id || p.id}>
                      {p.name.toUpperCase()} ({p.chariow_product_id || 'Aucun code'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Étape 2 : Email */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-widest block">2. E-mail du client</label>
                <input
                  type="email"
                  placeholder="Ex: client@exemple.com"
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              {/* Étape 3 : Statut */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-widest block">3. Statut du paiement</label>
                <select
                  value={simEvent}
                  onChange={(e) => setSimEvent(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white uppercase font-bold outline-none focus:border-orange-500"
                >
                  <option value="successful.sale">Vente réussie (Gains validés)</option>
                  <option value="abandoned.sale">Achat abandonné (Échec)</option>
                  <option value="failed.sale">Paiement rejeté / Échoué</option>
                </select>
              </div>
            </div>

            {simResult && (
              <div className={`p-3.5 rounded-xl text-[11px] font-bold uppercase transition-all ${
                simResult.success 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {simResult.message}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSimulatePulse}
                disabled={simSending}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {simSending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Traitement de la simulation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Déclencher le signal de vente de test</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* LISTE DES LOGS */}
          <div className="space-y-4">
            {loadingLogs && logs.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-yellow-500" />
                <p className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Chargement des pulses depuis le serveur...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 border border-white/5 rounded-3xl bg-neutral-900/10 space-y-2">
                <Database size={24} className="text-neutral-700 mx-auto" />
                <p className="text-[10px] uppercase font-black tracking-widest text-neutral-600">Aucun signal reçu enregistré</p>
                <p className="text-[9px] text-white/20 uppercase tracking-widest">
                  Déclenchez un paiement ou configurez votre URL de webhook Chariow pour recevoir des signaux
                </p>
              </div>
            ) : (
              <div className="border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const payload = log.payload as any;
                  
                  return (
                    <div key={log.id} className="bg-black/20 hover:bg-neutral-950/20 transition-colors">
                      {/* En-tête du log */}
                      <div 
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="space-y-1.5 flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[9px] bg-white/5 px-2 py-1 rounded text-neutral-400 font-bold">
                              ID: {log.id}
                            </span>
                            <span className="text-xs font-black uppercase text-white tracking-tight">
                              {payload.event}
                            </span>
                            {getStatusBadge(payload.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-2">
                            {payload.matched_product_name && (
                              <div className="flex items-center gap-1">
                                <span className="text-neutral-600">Produit MZ+:</span> 
                                <span className="text-yellow-500">{payload.matched_product_name}</span>
                              </div>
                            )}
                            {payload.product_id && (
                              <div className="flex items-center gap-1">
                                <span className="text-neutral-600">ID Chariow:</span> 
                                <span className="text-neutral-400 font-mono text-[8px]">{payload.product_id}</span>
                              </div>
                            )}
                            {payload.email && (
                              <div className="flex items-center gap-1">
                                <span className="text-neutral-600">Client:</span> 
                                <span className="text-white lowercase">{payload.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-600">Reçu le:</span> 
                              <span className="text-neutral-500 flex items-center gap-1 font-mono text-[9px]">
                                <Clock size={10} /> {new Date(log.received_at).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-neutral-900/40 border border-white/5 rounded-xl text-[10px] text-neutral-300 font-medium font-sans leading-relaxed mt-3">
                            {payload.details}
                          </div>
                        </div>

                        {/* Bouton pour étendre / Voir JSON */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button 
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"
                          >
                            <Eye size={12} /> {isExpanded ? 'Réduire' : 'Voir JSON'}
                          </button>
                        </div>
                      </div>

                      {/* Corps visible si étendu (Raw JSON payload) */}
                      {isExpanded && (
                        <div className="p-5 bg-[#050505] border-t border-white/5">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black text-neutral-500 uppercase flex items-center gap-1.5">
                              <Database size={12} className="text-yellow-500" /> Charge utile de la requête HTTP POST Chariow (Pulse Body)
                            </span>
                            <span className="text-[8px] font-mono text-neutral-700">Content-Type: application/json</span>
                          </div>
                          
                          <pre className="p-4 bg-black border border-white/5 rounded-2xl text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-[350px] leading-relaxed custom-scrollbar">
                            <code>{JSON.stringify(payload.body, null, 2)}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex items-start gap-3">
            <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-[10px] text-yellow-500 uppercase font-black tracking-wider">Comment connecter l'API Chariow ?</p>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Connectez-vous sur votre tableau de bord Chariow, accédez à <span className="text-white font-bold">Automatisation → Pulses</span>, puis ajoutez un Pulse Webhook avec l'adresse HTTPS publique suivante :
              </p>
              
              {/* Calcul automatique de l'URL publique -pre- pour contourner la barrière d'authentification de l'iframe de dev */}
              {(() => {
                const origin = window.location.origin;
                const isDevUrl = origin.includes('-dev-') || origin.includes('-pre-') || origin.includes('localhost') || origin.includes('run.app');
                
                let devPublicUrl = '';
                if (origin.includes('-dev-')) {
                  devPublicUrl = origin.replace('-dev-', '-pre-') + '/api/chariow/pulse';
                } else if (origin.includes('-pre-') || origin.includes('run.app') || origin.includes('localhost')) {
                  devPublicUrl = origin + '/api/chariow/pulse';
                }

                const hasDevUrl = devPublicUrl !== '';
                
                return (
                  <div className="space-y-3">
                    {hasDevUrl ? (
                      <div>
                        <span className="text-[9px] text-neutral-400 block mb-1 uppercase font-bold text-yellow-500/80">🔴 URL DE TEST / PRÉVISUALISATION (AI STUDIO) :</span>
                        <pre className="p-3 bg-black border border-white/15 rounded-xl text-[10px] text-yellow-400 font-mono select-all block w-full overflow-x-auto my-1 shadow-inner">
                          {devPublicUrl}
                        </pre>
                        <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[9px] text-yellow-300 leading-relaxed font-semibold">
                          ⚠️ NOTE DE TEST : Cette adresse sert uniquement pour la prévisualisation AI Studio. Si le projet de test AI Studio est inactif ou s'endort, Chariow ne pourra pas l'atteindre.
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <span className="text-[9px] text-neutral-400 block mb-1 uppercase font-bold text-emerald-500">🟢 URL DE PRODUCTION RÉELLE EN DIRECT :</span>
                      <pre className="p-3 bg-black border border-emerald-500/30 rounded-xl text-[10px] text-emerald-400 font-mono select-all block w-full overflow-x-auto my-1 shadow-inner">
                        {(!hasDevUrl) ? `${origin}/api/chariow/pulse` : "https://[votre-domaine-production].com/api/chariow/pulse"}
                      </pre>
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] text-emerald-300 leading-relaxed font-semibold">
                        💡 DIRECTIVE DE PRODUCTION : Sur votre site en production (Netlify ou nom de domaine propre), Chariow utilisera cette URL de production pour notifier la base de données de toutes les transactions réelles en millisecondes !
                      </div>
                    </div>
                  </div>
                );
              })()}

              <p className="text-[9px] text-neutral-500 italic">
                Cochez l'événement correspondant aux ventes finalisées (<span className="text-white font-bold">successful.sale</span>), abandonnées (<span className="text-white font-bold">abandoned.sale</span>), et échouées (<span className="text-white font-bold">failed.sale</span>). Dès qu'un client achète ou ferme la page, la commission affiliée se mettra à jour instantanément !
              </p>
            </div>
          </div>
        </div>
      </GoldBorderCard>
    </div>
  );
};
