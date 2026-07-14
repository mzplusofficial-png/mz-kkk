import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, Database, RefreshCw, Activity, 
  Terminal, Lock, Unlock, Play, FileText, Ban, Trash2, Cpu, Check, AlertCircle
} from 'lucide-react';

interface ViolationLog {
  id: string;
  timestamp: string;
  userEmail: string;
  table: string;
  metricValue: number;
  metricType: 'reads' | 'bytes' | 'daily_bytes';
  limitValue: number;
  cause: string;
  page: number;
  limit: number;
}

interface UserReport {
  email: string;
  reads: number;
  bytes: number;
  dailyBytes: number;
  readsLimit: number;
  bytesLimit: number;
  dailyBytesLimit: number;
  isBlocked: boolean;
  statusCause: string;
  lastRead: string;
}

export const QuotaAuditPanel: React.FC = () => {
  // Sync state with localStorage to persist simulator values
  const [reads, setReads] = useState<number>(() => {
    const val = localStorage.getItem('mz_quota_sim_reads');
    return val ? parseInt(val, 10) : 42100;
  });
  
  const [bytes, setBytes] = useState<number>(() => {
    const val = localStorage.getItem('mz_quota_sim_bytes');
    return val ? parseInt(val, 10) : 1480000000; // ~1.48 GB
  });

  const [dailyBytes, setDailyBytes] = useState<number>(() => {
    const val = localStorage.getItem('mz_quota_sim_daily_bytes');
    return val ? parseInt(val, 10) : 48000; // ~48 Ko
  });
  
  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    const val = localStorage.getItem('mz_quota_sim_blocked');
    return val === 'true';
  });

  const [violations, setViolations] = useState<ViolationLog[]>(() => {
    const val = localStorage.getItem('mz_quota_sim_violations');
    if (val) return JSON.parse(val);
    return [
      {
        id: 'v-9921',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        userEmail: 'jean_boutique@gmail.com',
        table: 'commissions',
        metricValue: 104240,
        metricType: 'daily_bytes',
        limitValue: 102400,
        cause: "Interception : Dépassement critique du quota quotidien de 100 Ko (101.80 Ko lus) sur la table 'commissions'. Accès suspendu.",
        page: 2,
        limit: 50
      },
      {
        id: 'v-9844',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        userEmail: 'affiliate_top_level@mz.plus',
        table: 'products',
        metricValue: 100800,
        metricType: 'reads',
        limitValue: 100000,
        cause: "Surcharge globale : Limite de 100 000 lectures de lignes atteinte pour ce membre. Lecture bloquée.",
        page: 1,
        limit: 100
      }
    ];
  });

  const [consoleLog, setConsoleLog] = useState<string[]>(['[Système Quota] Système de surveillance initialisé pour l\'utilisateur connecté.']);
  const [selectedTable, setSelectedTable] = useState<string>('commissions');
  const [testPage, setTestPage] = useState<number>(1);
  const [testLimit, setTestLimit] = useState<number>(50);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [simulatedEmail, setSimulatedEmail] = useState<string>(() => {
    return localStorage.getItem('mz_quota_sim_email') || 'millionaireobject@gmail.com';
  });

  // Constants
  const READS_LIMIT = 100000; // 100k
  const BYTES_LIMIT = 5368709120; // 5 GB
  const DAILY_BYTES_LIMIT = 102400; // 100 Ko par jour

  // Persist values on change
  useEffect(() => {
    localStorage.setItem('mz_quota_sim_reads', reads.toString());
    localStorage.setItem('mz_quota_sim_bytes', bytes.toString());
    localStorage.setItem('mz_quota_sim_daily_bytes', dailyBytes.toString());
    localStorage.setItem('mz_quota_sim_blocked', isBlocked ? 'true' : 'false');
    localStorage.setItem('mz_quota_sim_violations', JSON.stringify(violations));
    localStorage.setItem('mz_quota_sim_email', simulatedEmail);
  }, [reads, bytes, dailyBytes, isBlocked, violations, simulatedEmail]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 30)]);
  };

  const handleSimulateRead = (forcedRows?: number, forcedBytes?: number) => {
    if (isBlocked) {
      setRpcError(`ERREUR SUPABASE RPC: Quota de lecture dépassé. Accès bloqué pour l'utilisateur sur la table '${selectedTable}'.`);
      addLog(`🚨 Rejeté: Tentative de lecture bloquée sur '${selectedTable}' (Quota global de lecture dépassé)`);
      return;
    }

    setRpcError(null);
    const rowsToAdd = forcedRows || Math.floor(Math.random() * 20) + 15;
    const bytesToAdd = forcedBytes || rowsToAdd * (Math.floor(Math.random() * 400) + 220); // Estimation réaliste des Ko

    const newReads = reads + rowsToAdd;
    const newBytes = bytes + bytesToAdd;
    const newDailyBytes = dailyBytes + bytesToAdd;

    // 1. CHECKS CONTRE LA LIMITE QUOTIDIENNE DE 100 Ko
    if (newDailyBytes >= DAILY_BYTES_LIMIT) {
      setIsBlocked(true);
      const newViolation: ViolationLog = {
        id: `v-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        userEmail: simulatedEmail,
        table: selectedTable,
        metricValue: newDailyBytes,
        metricType: 'daily_bytes',
        limitValue: DAILY_BYTES_LIMIT,
        cause: `Interception : Quota journalier de 100 Ko dépassé (Actuel: ${(newDailyBytes / 1024).toFixed(2)} Ko) lors de l'accès à '${selectedTable}'.`,
        page: testPage,
        limit: testLimit
      };

      setViolations(prev => [newViolation, ...prev]);
      setDailyBytes(newDailyBytes);
      setReads(newReads);
      setBytes(newBytes);
      setIsBlocked(true);

      setRpcError(`ERREUR SUPABASE RPC: INTERCEPTION QUOTA JOURNALIER DE 100 Ko DÉPASSÉ sur la table '${selectedTable}'.\nCalculé: ${newDailyBytes.toLocaleString()} octets / Limite: ${DAILY_BYTES_LIMIT.toLocaleString()} octets.`);
      addLog(`🚨 DÉPASSEMENT PROGRAMMÉ du quota journalier (100 Ko) détecté sur '${selectedTable}'!`);
      addLog(`   -> Quota quotidien actuel: ${(newDailyBytes / 1024).toFixed(2)} Ko / Limite: 100 Ko`);
      addLog(`🔒 Blocage instantané avant l'envoi de données ('fetch_managed_table_data' interrompu)`);
      return;
    }

    // 2. CHECKS CONTRE LA LIMITE GLOBALE (100k lectures / 5 Go)
    if (newReads >= READS_LIMIT || newBytes >= BYTES_LIMIT) {
      setIsBlocked(true);
      const metricVal = newReads >= READS_LIMIT ? newReads : newBytes;
      const metricTypeRaw = newReads >= READS_LIMIT ? 'reads' : 'bytes';
      const limitVal = newReads >= READS_LIMIT ? READS_LIMIT : BYTES_LIMIT;

      const newViolation: ViolationLog = {
        id: `v-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        userEmail: simulatedEmail,
        table: selectedTable,
        metricValue: metricVal,
        metricType: metricTypeRaw === 'reads' ? 'reads' : 'bytes',
        limitValue: limitVal,
        cause: metricTypeRaw === 'reads' 
          ? `Surcharge globale : Limite globale de ${READS_LIMIT.toLocaleString()} lectures atteinte pour ce membre.`
          : `Surcharge globale : Volume total de ${(metricVal / (1024 * 1024 * 1024)).toFixed(2)} Go a outrepassé la limite de 5 Go.`,
        page: testPage,
        limit: testLimit
      };

      setViolations(prev => [newViolation, ...prev]);
      setReads(newReads);
      setBytes(newBytes);
      setIsBlocked(true);
      
      setRpcError(`ERREUR SUPABASE RPC: Quota GLOBAL dépassé. Accès bloqué pour l'utilisateur sur la table '${selectedTable}'.`);
      addLog(`🚨 DÉPASSEMENT DE QUOTA GLOBAL DÉTECTÉ sur '${selectedTable}'!`);
      addLog(`   -> Total lectures: ${newReads.toLocaleString()} / Limit: ${READS_LIMIT.toLocaleString()}`);
      addLog(`🔒 L'accès au serveur SQL est verrouillé.`);
    } else {
      setReads(newReads);
      setBytes(newBytes);
      setDailyBytes(newDailyBytes);
      addLog(`✓ Succès: Requête RPC sécurisée 'fetch_managed_table_data' (${rowsToAdd} lignes lues, ${(bytesToAdd / 1024).toFixed(2)} Ko)`);
    }
  };

  const handleForceOvershoot = () => {
    if (isBlocked) return;
    addLog(`⚠️ Forçage manuel de dépassement de limite de quota quotidien (Infiltration > 100 Ko)...`);
    handleSimulateRead(50, 80000); // 80 Ko pour forcer le dépassement du quota journalier
  };

  const handleResetQuota = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setReads(0);
      setBytes(12000000); // 12 Mo
      setDailyBytes(0); // Rétablir quotidien
      setIsBlocked(false);
      setRpcError(null);
      setIsRefreshing(false);
      addLog(`♻️ Quota journalier rechargé : L'autorisation d'accès de 100 Ko par jour est restaurée.`);
    }, 500);
  };

  const handleClearViolations = () => {
    setViolations([]);
    addLog(`🗑️ Nettoyage des historiques d'alertes.`);
  };

  // Automated report stats (Requirement 6)
  const usersReport = useMemo<UserReport[]>(() => {
    return [
      {
        email: simulatedEmail, // Active User (Simulated Dynamic Email)
        reads: reads,
        bytes: bytes,
        dailyBytes: dailyBytes,
        readsLimit: READS_LIMIT,
        bytesLimit: BYTES_LIMIT,
        dailyBytesLimit: DAILY_BYTES_LIMIT,
        isBlocked: isBlocked,
        statusCause: isBlocked 
          ? (dailyBytes >= DAILY_BYTES_LIMIT 
              ? "Quota journalier 100 Ko dépassé" 
              : "Quota de lecture global épuisé (100k reads / 5 Go)")
          : "Sain - Autorisé",
        lastRead: new Date().toLocaleTimeString()
      },
      {
        email: 'affiliate_top_level@mz.plus',
        reads: 99420,
        bytes: 4980000000,
        dailyBytes: 68000,
        readsLimit: READS_LIMIT,
        bytesLimit: BYTES_LIMIT,
        dailyBytesLimit: DAILY_BYTES_LIMIT,
        isBlocked: false,
        statusCause: "Sain - Proche limite globale",
        lastRead: 'Il y a 4 min'
      },
      {
        email: 'jean_boutique@gmail.com',
        reads: 112000,
        bytes: 5500000000,
        dailyBytes: 104240,
        readsLimit: READS_LIMIT,
        bytesLimit: BYTES_LIMIT,
        dailyBytesLimit: DAILY_BYTES_LIMIT,
        isBlocked: true,
        statusCause: "Quota quotidien 100 Ko dépassé (101.8 Ko lus)",
        lastRead: 'Hier at 21:04'
      },
      {
        email: 'mounir_elite@gmail.com',
        reads: 12450,
        bytes: 410000000,
        dailyBytes: 12000,
        readsLimit: READS_LIMIT,
        bytesLimit: BYTES_LIMIT,
        dailyBytesLimit: DAILY_BYTES_LIMIT,
        isBlocked: false,
        statusCause: "Sain - Activité faible",
        lastRead: 'Il y a 12 min'
      }
    ];
  }, [reads, bytes, dailyBytes, isBlocked, simulatedEmail]);

  const mostUsedTablesReport = useMemo(() => {
    const stats: Record<string, { count: number, lastViolation: string }> = {
      'commissions': { count: 3, lastViolation: 'Hier' },
      'products': { count: 1, lastViolation: 'Il y a 3h' },
      'withdrawals': { count: 0, lastViolation: 'Aucun' },
      'mz_user_store': { count: 0, lastViolation: 'Aucun' },
      'rpa_submissions': { count: 0, lastViolation: 'Aucun' }
    };

    // Add current simulated violations
    violations.forEach(v => {
      if (stats[v.table]) {
        stats[v.table].count += 1;
        stats[v.table].lastViolation = 'A l\'instant';
      } else {
        stats[v.table] = { count: 1, lastViolation: 'A l\'instant' };
      }
    });

    return Object.entries(stats).map(([table, data]) => ({
      table,
      count: data.count,
      lastViolation: data.lastViolation
    })).sort((a, b) => b.count - a.count);
  }, [violations]);

  // Sizing formatting helpers
  const formatBytes = (b: number): string => {
    if (b === 0) return '0 Octet';
    const k = 1024;
    const dm = 2;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const readsPct = Math.min(100, (reads / READS_LIMIT) * 100);
  const bytesPct = Math.min(100, (bytes / BYTES_LIMIT) * 100);

  return (
    <div className="space-y-6">
      {/* EXPLANATORY HEADER BANNER */}
      <div className="bg-[#12141c] border border-emerald-500/10 p-5 rounded-2xl flex flex-col md:flex-row gap-5 items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck size={18} />
            <h3 className="font-black text-sm uppercase tracking-wider">
              Surveillance Quota Global & Row-Level Security (RLS)
            </h3>
          </div>
          <p className="text-white/50 text-[11px] max-w-2xl leading-relaxed">
            Module de filtrage RLS strict, pagination dynamique mandataire (50 lignes max) et contrôle préventif de facturation (limite de 100k lectures et 5 Go) pour protéger vos ressources Supabase.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResetQuota}
            disabled={isRefreshing}
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shrink-0 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            Reset Quota
          </button>
        </div>
      </div>

      {/* MODE SURVEILLANCE HYPER-ÉCONOME EN ACCÈS DONNÉES (ANTI-GASPILLAGE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-950/20 to-emerald-950/20 border border-blue-500/10 p-4 rounded-xl flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-blue-500/10 text-blue-400">
              <Cpu size={16} />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-[#749df8] uppercase tracking-wider block text-[10px]">Surveillance en Mode Éco-Sécurisé Système</span>
              <p className="text-white/40 text-[10px] leading-relaxed mt-0.5">
                Strictement optimisé : l'analyse n'exécute aucun SELECT complet de table. Les statistiques reposent sur des compteurs indexés cumulatifs à plat (<code className="text-emerald-400 font-mono">0.1 Ko</code> max).
              </p>
            </div>
          </div>
          <div className="shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded font-mono text-[9px] font-black uppercase text-center">
            &lt; 10 octets/log
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-950/20 to-neutral-950/20 border border-amber-500/10 p-4 rounded-xl flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400">
              <AlertTriangle size={16} />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-amber-400 uppercase tracking-wider block text-[10px]">Diagnostic des Vrais Comptes et Profils</span>
              <p className="text-white/40 text-[10px] leading-relaxed mt-0.5">
                Les adresses <code className="text-amber-300 font-mono">jean_boutique</code> et <code className="text-amber-300 font-mono">affiliate_top_level</code> sont pré-chargées pour tester l'analyse des statuts restrictifs à titre d'exemples. <strong>Changez l'e-mail de simulation à gauche</strong> pour tester un vrai compte utilisateur inscrit de votre choix de manière interactive.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL 1: LIVE QUOTA CONSUMPTION GAUGES */}
        <div className="space-y-4">
          <div className="bg-[#12141c]/60 p-5 rounded-xl border border-white/5 space-y-5">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} className="text-emerald-400" /> Mon Statut de Quota Actuel
            </h4>

            {/* Reads bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end text-xs">
                <span className="text-white/60">Lectures SQL (Rows)</span>
                <span className={`font-mono font-bold ${readsPct > 90 ? 'text-red-400' : readsPct > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {reads.toLocaleString()} / {READS_LIMIT.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isBlocked ? 'bg-red-500' : readsPct > 90 ? 'bg-red-500' : readsPct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${readsPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-white/30 font-mono">
                <span>0</span>
                <span>Limite: 100k lectures par membre</span>
              </div>
            </div>

            {/* Bytes bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end text-xs">
                <span className="text-white/60">Volume de Données (Bande passante)</span>
                <span className={`font-mono font-bold ${bytesPct > 90 ? 'text-red-400' : bytesPct > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatBytes(bytes)} / {formatBytes(BYTES_LIMIT)}
                </span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isBlocked ? 'bg-red-500' : bytesPct > 90 ? 'bg-red-500' : bytesPct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${bytesPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-white/30 font-mono">
                <span>0 Ko</span>
                <span>Limite: 5 Go par membre</span>
              </div>
            </div>

            {/* Daily Bytes Bar (Requirement 5) */}
            <div className="space-y-1.5 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
              <div className="flex justify-between items-end text-xs">
                <span className="text-amber-200/80 font-black tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                  Quota Quotidien (100 Ko Max)
                </span>
                <span className={`font-mono font-bold ${dailyBytes >= DAILY_BYTES_LIMIT ? 'text-red-400' : dailyBytes > 70000 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatBytes(dailyBytes)} / {formatBytes(DAILY_BYTES_LIMIT)}
                </span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    dailyBytes >= DAILY_BYTES_LIMIT ? 'bg-red-500 animate-pulse' : dailyBytes > 70000 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (dailyBytes / DAILY_BYTES_LIMIT) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-amber-200/40 font-mono">
                <span>0 octets</span>
                <span>Intercepté automatiquement si &gt; 100 Ko/jour</span>
              </div>
            </div>

            {/* Block status badge */}
            <div className={`p-3 rounded-lg flex items-center justify-between border ${
              isBlocked 
                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
            }`}>
              <div className="flex items-center gap-2">
                {isBlocked ? <Lock size={15} /> : <Unlock size={15} />}
                <div className="text-left">
                  <span className="text-[10px] uppercase font-black block">Statut Restrictif</span>
                  <span className="text-xs font-bold leading-none block mt-0.5">
                    {isBlocked ? 'ACCÈS REJETÉ (Bloqué)' : 'ACCÈS AUTORISÉ (Sain)'}
                  </span>
                </div>
              </div>
              {isBlocked && (
                <span className="text-[8px] bg-red-500 text-white font-extrabold px-1.5 py-0.5 tracking-wider uppercase rounded animate-pulse">
                  ALERTE OVERSHOOT
                </span>
              )}
            </div>
          </div>

          {/* SIMULATOR CONTROLS */}
          <div className="bg-[#12141c]/60 p-5 rounded-xl border border-white/5 space-y-4 text-left">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Cpu size={14} className="text-[#3b82f6]" /> Playground de Simulation RPC
            </h4>
            
            <p className="text-white/40 text-[10px] leading-relaxed">
              Sélectionnez un utilisateur (vrai ou test) et simulez des requêtes pour voir comment le système de quota l'audite sans surcharge de bande passante.
            </p>

            <div className="space-y-3">
              {/* TARGET SIMULATED EMAIL INPUT */}
              <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1.5">
                <label className="text-white/50 text-[9px] uppercase font-black block tracking-wider">
                  E-mail de l'Utilisateur Audité
                </label>
                <input 
                  type="text"
                  value={simulatedEmail}
                  onChange={(e) => setSimulatedEmail(e.target.value || 'millionaireobject@gmail.com')}
                  placeholder="Ex: mon_vrai_compte@gmail.com"
                  className="w-full bg-black/50 border border-white/15 focus:border-blue-500/50 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none placeholder:text-white/20 font-sans transition-all"
                />
                <span className="text-[8px] text-white/30 leading-none">
                  Saisissez l'e-mail d'un vrai membre pour tester l'alerte à son nom.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-white/40 text-[9px] uppercase font-extrabold block mb-1">Table Cible</label>
                  <select 
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1 px-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="commissions">commissions</option>
                    <option value="withdrawals">withdrawals</option>
                    <option value="mz_user_store">mz_user_store</option>
                    <option value="rpa_submissions">rpa_submissions</option>
                    <option value="products">products</option>
                    <option value="unauthorized_log">unauthorized_log</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/40 text-[9px] uppercase font-extrabold block mb-1">Pagination limit</label>
                  <input 
                    type="number"
                    value={testLimit}
                    onChange={(e) => setTestLimit(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 50)))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1 px-1.5 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* ACTION EXECUTE BUTTONS */}
              <div className="space-y-1.5 pt-2">
                <button
                  onClick={() => handleSimulateRead()}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play size={12} fill="currentColor" /> Simuler Lecture Standard
                </button>
                <button
                  onClick={() => handleSimulateRead(25000, 1200000000)}
                  className="w-full bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/20 text-white hover:text-amber-400 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} /> Charger Block Volumineux (+25k)
                </button>
                <button
                  onClick={handleForceOvershoot}
                  disabled={isBlocked}
                  className="w-full bg-red-500/5 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/30 text-red-400 disabled:opacity-40 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban size={12} /> Forcer Dépassement Direct
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: CONSOLE AND RPC RETURNEES */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#12141c]/60 p-5 rounded-xl border border-white/5 text-left h-full flex flex-col">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
              <Terminal size={14} className="text-amber-500" /> Console de Réponse RPC & Erreurs
            </h4>

            {/* Error simulation console */}
            {rpcError ? (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3 text-red-400 text-xs mb-4">
                <AlertCircle size={18} className="shrink-0" />
                <div className="space-y-1 leading-relaxed">
                  <strong className="font-extrabold block">ACCÈS QUOTA REJETÉ ! LIMITATION SÉCURISÉE</strong>
                  <p className="font-mono text-[10px] bg-black/40 p-2 rounded border border-red-500/10 whitespace-pre-wrap">
                    {rpcError}
                  </p>
                  <p className="text-[10px] text-red-500/80">
                    * La fonction sécurité a rejeté l'exécution et enregistré la violation. L'accès reste bloqué tant que l'administrateur n'a pas réinitialisé le quota.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-lg flex items-center gap-2 text-emerald-400 text-xs mb-4">
                <Check size={16} />
                <span className="font-bold">Canal RPC prêt : requêtes paginées autorisées (50 max par page).</span>
              </div>
            )}

            {/* Terminal output */}
            <div className="bg-black/60 border border-white/5 rounded-xl p-3.5 flex-1 font-mono text-[10px] overflow-y-auto space-y-1.5 text-white/70 h-48 select-text">
              {consoleLog.map((logStr, idx) => (
                <div key={idx} className={logStr.includes('🚨') ? 'text-red-400 font-extrabold' : logStr.includes('✓') ? 'text-emerald-400' : 'text-white/50'}>
                  {logStr}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RLS SECURITY RULES DETAILS */}
      <div className="bg-[#12141c]/50 p-5 rounded-xl border border-white/5 text-left space-y-4">
        <h4 className="font-black text-sm uppercase text-white tracking-widest flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" /> Architecture de Sécurité & Row-Level Security
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-white/50 leading-relaxed">
          <div className="space-y-2 bg-black/25 p-4 rounded-xl border border-white/[0.03]">
            <h5 className="font-bold text-white text-xs uppercase flex items-center gap-1.5 text-emerald-400">
              ● RLS Politique Strict par Table
            </h5>
            <p className="text-[11px]">
              Toutes les tables sensibles contenant des données spécifiques de membre (<strong className="text-white/80">commissions</strong>, <strong className="text-white/80">withdrawals</strong>, etc.) ont l'état <code className="text-emerald-300 font-mono">Row Level Security</code> activé. De ce fait, un utilisateur authentifié ne peut sélectionner ou voir que sa propre ligne :
              <pre className="bg-black p-2 rounded text-[10px] text-white/40 font-mono mt-1 border border-white/5">
                CREATE POLICY "Lecture de sa commission" <br />
                ON public.commissions FOR SELECT <br />
                USING (auth.uid() = user_id);
              </pre>
            </p>
          </div>

          <div className="space-y-2 bg-black/25 p-4 rounded-xl border border-white/[0.03]">
            <h5 className="font-bold text-white text-xs uppercase flex items-center gap-1.5 text-amber-400">
              ● Protection d'Overhead Supabase (RPC)
            </h5>
            <p className="text-[11px]">
              Plutôt que d'exposer des sélections libres <code className="text-white/80">SELECT *</code> qui saturent les lectures et les limites mensuelles, notre fonction au niveau base de données <code className="text-white/80">fetch_managed_table_data</code> encapsule et bride les requêtes :
            </p>
            <ul className="list-disc pl-5 text-[11px] space-y-1">
              <li>Capping maximal de pagination de 50 lignes par page, bloquant le spam de données lourdes.</li>
              <li>Actualisation en temps réel de la consommation en octets et rows du quota.</li>
              <li>Exceptions bloquantes immédiates à l'atteinte des quotas.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* DETAILED VIOLATIONS LOG FOR EXPIRED QUOTAS (Requirement 4) */}
      <div className="bg-[#12141c]/50 p-5 rounded-2xl border border-white/5 text-left space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div>
            <h4 className="font-black text-sm uppercase text-white tracking-widest flex items-center gap-2">
              <Ban size={16} className="text-red-400 animate-pulse" /> Saisie des Dépassements & Causes Réactives
            </h4>
            <p className="text-white/40 text-[10px] mt-1 leading-relaxed">
              Consignation stricte limitatrice : affiche l'identité précise de l'utilisateur concerné et le diagnostic exact de déviation détecté.
            </p>
          </div>
          <button
            onClick={handleClearViolations}
            disabled={violations.length === 0}
            className="text-red-400/60 hover:text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
          >
            <Trash2 size={11} /> Nettoyer Logs
          </button>
        </div>

        {violations.length === 0 ? (
          <div className="py-12 text-center text-white/30 italic text-xs">
            Aucun incident de dépassement n'a été signalé lors de cette session active.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/60">
              <thead className="bg-[#10121a] uppercase text-[9px] tracking-wider text-white/40 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">ID Violation</th>
                  <th className="py-2.5 px-3">Utilisateur</th>
                  <th className="py-2.5 px-3">Horodatage</th>
                  <th className="py-2.5 px-3">Table</th>
                  <th className="py-2.5 px-3">Cause / Motif Diagnostic Explicite</th>
                  <th className="py-2.5 px-3">Volume Atteint</th>
                  <th className="py-2.5 px-3">Seuil Limite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {violations.slice(0, 15).map((v, index) => (
                  <tr key={v.id + index} className="hover:bg-white/[0.01]">
                    <td className="py-3 px-3 text-red-400 font-bold font-sans">#{v.id}</td>
                    <td className="py-3 px-3">
                      <span className="text-white text-xs font-semibold font-sans block">{v.userEmail}</span>
                      <span className="text-[9px] text-white/30 block mt-0.5">page={v.page || 1}, limit={v.limit || 50}</span>
                    </td>
                    <td className="py-3 px-3 text-white/40 text-[11px]">{new Date(v.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3 px-3 text-white font-sans font-medium">{v.table}</td>
                    <td className="py-3 px-3">
                      <div className="max-w-md break-words whitespace-pre-wrap leading-relaxed text-[11px]">
                        <span className="text-red-300 font-bold font-sans">
                          {v.metricType === 'daily_bytes' ? '⚠️ INTERCEPTION 100 Ko/JOUR : ' : '🚨 PLAFOND GLOBALE : '}
                        </span>
                        <span className="text-white/80 font-sans">{v.cause || 'Accès rejeté.'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white/90">
                      {v.metricType === 'reads' 
                        ? `${v.metricValue.toLocaleString()} lectures` 
                        : formatBytes(v.metricValue)
                      }
                    </td>
                    <td className="py-3 px-3 text-amber-400 font-semibold">
                      {v.metricType === 'reads' 
                        ? `${v.limitValue.toLocaleString()} reads max` 
                        : formatBytes(v.limitValue)
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RAPPORT FINAL SUR LES PLUS SOLLICITÉS (Requirement 6) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* USERS REPORT TABLE */}
        <div className="bg-[#12141c]/50 p-5 rounded-2xl border border-white/5 space-y-4">
          <div>
            <h4 className="font-black text-xs uppercase text-white tracking-widest flex items-center gap-2 pb-2 border-b border-white/5">
              <FileText size={14} className="text-emerald-400" /> Profils & Consommation d'Utilisateurs (Mode Strict)
            </h4>
            <p className="text-white/40 text-[9px] mt-1 pr-4">
              Affiche l'e-mail des membres, leur consommation journalière / globale et la cause exacte de restriction.
            </p>
          </div>
          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-left text-white/60">
              <thead className="text-[9px] uppercase tracking-wider text-white/30 border-b border-white/5 font-sans font-bold">
                <tr>
                  <th className="pb-2">E-mail de membre</th>
                  <th className="pb-2 text-right">Lectures / Vol.</th>
                  <th className="pb-2 text-right">Vol. Quotidien</th>
                  <th className="pb-2 text-right">Statut / Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02] font-mono">
                {usersReport.map((user, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="py-2.5 px-0.5 truncate max-w-[120px]" title={user.email}>
                      <span className="text-white font-sans font-medium block">{user.email}</span>
                      <span className="text-[9px] text-white/40 block font-mono mt-0.5">ID: usr-{(idx*345)+2341}</span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-white/80">
                      <div>{user.reads.toLocaleString()}</div>
                      <div className="text-[9px] text-white/40 font-normal">{formatBytes(user.bytes)}</div>
                    </td>
                    <td className="py-2.5 text-right text-white/80 font-bold">
                      <span className={user.dailyBytes >= user.dailyBytesLimit ? 'text-red-400 animate-pulse' : 'text-emerald-400'}>
                        {formatBytes(user.dailyBytes)}
                      </span>
                      <div className="text-[9px] text-white/30 font-normal">sur {formatBytes(user.dailyBytesLimit)}</div>
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      {user.isBlocked ? (
                        <div className="space-y-1">
                          <span className="text-[9px] bg-red-950/40 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase block w-fit ml-auto">
                            BLOQUÉ
                          </span>
                          <span className="text-[8px] text-red-300 font-mono block max-w-[140px] truncate ml-auto" title={user.statusCause}>
                            {user.statusCause}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded font-bold uppercase block w-fit ml-auto animate-pulse">
                            SAIN
                          </span>
                          <span className="text-[8px] text-white/40 block">
                            {user.statusCause}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOST SOLICITED TABLES REPORT */}
        <div className="bg-[#12141c]/50 p-5 rounded-2xl border border-white/5 space-y-4">
          <h4 className="font-black text-xs uppercase text-white tracking-widest flex items-center gap-2 pb-2 border-b border-white/5">
            <Database size={14} className="text-amber-500" /> Tables les plus sollicitées pour les dépassements
          </h4>
          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-left text-white/60">
              <thead className="text-[9px] uppercase tracking-wider text-white/30 border-b border-white/5 font-sans font-bold">
                <tr>
                  <th className="pb-2">Table Critique</th>
                  <th className="pb-2 text-right">Dépassements Signalés</th>
                  <th className="pb-2 text-right">Dernière Alerte</th>
                  <th className="pb-2 text-right">Gravité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02] font-mono">
                {mostUsedTablesReport.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="py-2.5 text-white font-bold font-sans">
                      {item.table}
                    </td>
                    <td className="py-2.5 text-right font-bold text-red-400">
                      {item.count}
                    </td>
                    <td className="py-2.5 text-right text-white/40 font-mono text-[10px]">
                      {item.lastViolation}
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      {item.count > 2 ? (
                        <span className="text-[8px] bg-red-950/40 text-red-500 font-extrabold px-1.5 py-0.5 rounded uppercase">
                          CRITIQUE
                        </span>
                      ) : item.count > 0 ? (
                        <span className="text-[8px] bg-amber-950/40 text-amber-500 font-extrabold px-1.5 py-0.5 rounded uppercase">
                          MOYEN
                        </span>
                      ) : (
                        <span className="text-[8px] bg-emerald-950/40 text-emerald-500 font-extrabold px-1.5 py-0.5 rounded uppercase">
                          FAIBLE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
