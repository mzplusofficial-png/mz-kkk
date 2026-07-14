import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, AlertTriangle, ShieldCheck, CheckCircle2, Play, Square, 
  Trash2, RefreshCw, BarChart2, Table, Layout, Database, Clock, 
  Info, Cpu, ArrowUpRight, Search, Zap, Check, Eye, Copy, Store
} from 'lucide-react';
import { performanceAudit, AuditItem, RealtimeSubscription } from '../../../services/performanceAudit';
import { CurrencyDisplay } from '../../ui/CurrencyDisplay';
import { QuotaAuditPanel } from './QuotaAuditPanel';

export const PerfAuditDashboard: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(performanceAudit.isEnabled());
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [subs, setSubs] = useState<RealtimeSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarning, setFilterWarning] = useState<string | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'logs' | 'report' | 'realtime' | 'boutique' | 'quota'>('dashboard');
  const [copied, setCopied] = useState(false);

  const handleCopyReport = () => {
    try {
      const reportText = `📊 RAPPORT D'AUDIT DE PERFORMANCE MZ+
--------------------------------------------------
Date de l'audit : ${new Date().toLocaleString('fr-FR')}
Indice d'Efficience Globale : ${100 - globalWastageScore}%
Gaspillage estimé : ${globalWastageScore}%
Anomalies détectées : ${totalWarningsCount}
Volume transféré : ${(totalVolumeInBytes / 1024).toFixed(2)} Ko estimé
Exécution Moyenne : ${avgExecutionTime} ms
Total requêtes enregistrées : ${logs.length}

⚠️ ACTIONS RECOMMANDÉES PRIORITAIRES :
${reportCards.map((rec, idx) => `
[${idx + 1}] ${rec.title.toUpperCase()} (${rec.type.toUpperCase()})
• Description : ${rec.desc}
• Cible : ${rec.target}
• Gain Énergétique Estimé : ${rec.efficiencyGain}
`).join('\n')}
--------------------------------------------------
Généré localement par le Profiler MZ+ (Zéro overhead DB)`;

      navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Échec de la copie", err);
    }
  };

  // Load audit data on interval if enabled
  useEffect(() => {
    const updateStats = () => {
      setLogs(performanceAudit.getLogs());
      setSubs(performanceAudit.getSubscriptions());
    };

    updateStats();
    
    // Poll every 1.5 seconds to refresh the live metrics panel as they browse
    const interval = setInterval(() => {
      if (performanceAudit.isEnabled()) {
        updateStats();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isEnabled]);

  const handleToggleDiagnostic = () => {
    const nextState = !isEnabled;
    performanceAudit.setMode(nextState);
    setIsEnabled(nextState);
    if (!nextState) {
      setLogs([]);
      setSubs([]);
    } else {
      setLogs(performanceAudit.getLogs());
      setSubs(performanceAudit.getSubscriptions());
    }
  };

  const handleClearLogs = () => {
    performanceAudit.clearLogs();
    setLogs([]);
    setSubs([]);
    setSelectedItem(null);
  };

  // -------------------------------------------------------------
  // STATS & CALCULATIONS (All computed locally, zero DB overhead!)
  // -------------------------------------------------------------
  const totalVolumeInBytes = useMemo(() => {
    return logs.reduce((sum, item) => sum + item.dataSize, 0);
  }, [logs]);

  const avgExecutionTime = useMemo(() => {
    if (logs.length === 0) return 0;
    const sum = logs.reduce((sum, item) => sum + item.executionTime, 0);
    return Math.round(sum / logs.length);
  }, [logs]);

  const globalWastageScore = useMemo(() => {
    const activeItems = logs.filter(i => i.method.toUpperCase() === 'GET' && i.rowsCount > 0);
    if (activeItems.length === 0) return 0;
    const sum = activeItems.reduce((sum, item) => sum + item.wastageScore, 0);
    return Math.round(sum / activeItems.length);
  }, [logs]);

  const totalWarningsCount = useMemo(() => {
    return logs.reduce((sum, item) => sum + item.warnings.length, 0);
  }, [logs]);

  // Top Tables by request count
  const topTables = useMemo(() => {
    const counts: Record<string, { count: number; size: number; duration: number }> = {};
    logs.forEach(item => {
      const parent = item.table || (item.rpc ? `rpc:${item.rpc}` : 'Auth/System');
      if (!counts[parent]) {
        counts[parent] = { count: 0, size: 0, duration: 0 };
      }
      counts[parent].count += 1;
      counts[parent].size += item.dataSize;
      counts[parent].duration += item.executionTime;
    });

    return Object.entries(counts)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgSizeKb: Math.round((stats.size / stats.count / 1024) * 10) / 10,
        avgDuration: Math.round(stats.duration / stats.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs]);

  // Top Greedy Pages/Components
  const topComponents = useMemo(() => {
    const counts: Record<string, { count: number; size: number; duration: number; wasteSum: number; wasteCount: number }> = {};
    logs.forEach(item => {
      const comp = item.component || 'Inconnu';
      if (!counts[comp]) {
        counts[comp] = { count: 0, size: 0, duration: 0, wasteSum: 0, wasteCount: 0 };
      }
      counts[comp].count += 1;
      counts[comp].size += item.dataSize;
      counts[comp].duration += item.executionTime;
      if (item.method.toUpperCase() === 'GET' && item.rowsCount > 0) {
        counts[comp].wasteSum += item.wastageScore;
        counts[comp].wasteCount += 1;
      }
    });

    return Object.entries(counts)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        totalSizeKb: Math.round((stats.size / 1024) * 10) / 10,
        avgDuration: Math.round(stats.duration / stats.count),
        avgWaste: stats.wasteCount > 0 ? Math.round(stats.wasteSum / stats.wasteCount) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs]);

  // Top Most Expensive Queries
  const topExpensiveQueries = useMemo(() => {
    return [...logs]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 5);
  }, [logs]);

  // Filtered Logs list
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      // 1. Search filter
      const target = `${item.method} ${item.table || ''} ${item.rpc || ''} ${item.component}`.toLowerCase();
      const matchSearch = target.includes(searchTerm.toLowerCase());

      // 2. Warnings badge filter
      if (filterWarning === 'all') return matchSearch;
      
      const matchWarning = item.warnings.some(w => 
        w.toLowerCase().includes(filterWarning.toLowerCase())
      );
      
      return matchSearch && matchWarning;
    });
  }, [logs, searchTerm, filterWarning]);

  // -------------------------------------------------------------
  // AUTOMATIC ACTIONABLE RECOMMENDATIONS (REPORTS)
  // -------------------------------------------------------------
  const reportCards = useMemo(() => {
    const recs: { title: string; desc: string; type: 'critical' | 'warn' | 'info'; efficiencyGain: string; target: string }[] = [];

    // Analyze loops
    const loopAlerts = logs.filter(item => item.isDuplicate);
    if (loopAlerts.length > 0) {
      const worstComponent = loopAlerts[0].component;
      recs.push({
        title: "Boucle de requêtes répétitives",
        desc: `Le composant '${worstComponent}' effectue des requêtes répétées à intervalle ultra-court (< 3.5s). Cela est souvent dû à un hook useEffect manquant de tableaux de dépendances stabilisés.`,
        type: 'critical',
        efficiencyGain: "Réduit les lectures de 85% pour cette interface",
        target: worstComponent,
      });
    }

    // Analyze SELECT *
    const selectAllAlerts = logs.filter(item => item.warnings.some(w => w.includes('SELECT *')));
    if (selectAllAlerts.length > 0) {
      const tablesUsed = Array.from(new Set(selectAllAlerts.map(i => i.table).filter(Boolean)));
      recs.push({
        title: "Usage abusif de 'SELECT *'",
        desc: `Des requêtes demandent toutes les colonnes sur les tables [${tablesUsed.join(', ')}]. Spécifier uniquement les champs nécessaires (ex: .select('id, name')) évite le transfert inutile de colonnes lourdes.`,
        type: 'warn',
        efficiencyGain: "Économise environ 60% de bande passante client",
        target: tablesUsed.join(', '),
      });
    }

    // Analyze Unfiltered loads
    const unfilteredAlerts = logs.filter(item => item.warnings.some(w => w.includes('sans filtre utilisateur') || w.includes('Aucun filtre active')));
    if (unfilteredAlerts.length > 0) {
      const tablesUsed = Array.from(new Set(unfilteredAlerts.map(i => i.table).filter(Boolean)));
      recs.push({
        title: "Requêtes sans filtre utilisateur actif",
        desc: `Requêtes lancées sur des tables sensibles ou volumineuses [${tablesUsed.join(', ')}] sans aucun filtre 'user_id'. Cela peut charger des milliers d'enregistrements en mémoire et pose un risque de violation d'isolement de données.`,
        type: 'critical',
        efficiencyGain: "Sécurise et optimise instantanément l'app",
        target: tablesUsed.join(', '),
      });
    }

    // High Rows returned
    const bulkAlerts = logs.filter(item => item.rowsCount >= 100);
    if (bulkAlerts.length > 0) {
      const targetTable = bulkAlerts[0].table || bulkAlerts[0].rpc || 'Données';
      recs.push({
        title: "Absence de pagination sur requêtes massives",
        desc: `La table '${targetTable}' renvoie plus de 100 lignes d'un coup. Intégrer un filtre '.limit(20)' ou une pagination évitera le gel de l'affichage et réduira le transfert de données inutilisées.`,
        type: 'warn',
        efficiencyGain: "Division par 5 du temps de chargement initial",
        target: targetTable,
      });
    }

    // Under-the-hood Realtime Subs
    if (subs.length > 3) {
      recs.push({
        title: "Multiplication des abonnements Realtime",
        desc: `${subs.length} canaux Realtime détectés actifs. Assurez-vous que chaque composant se désabonne (channel.unsubscribe()) lors de son démontage pour ne pas saturer le navigateur.`,
        type: 'info',
        efficiencyGain: "Libère la mémoire et le thread de rendu principal",
        target: "Global",
      });
    }

    // Default suggestions if no clean issues
    if (recs.length === 0) {
      recs.push({
        title: "Architecture Excellente - Aucun gaspillage détecté !",
        desc: "L'analyse locale montre des requêtes hautement qualifiées, filtrées, et sans aucune anomalie majeure. Félicitations pour ce niveau d'ingénierie.",
        type: 'info',
        efficiencyGain: "N/A",
        target: "Aucune",
      });
    }

    return recs;
  }, [logs, subs]);

  return (
    <div className="bg-[#0b0c10]/80 border border-[#1f2833]/40 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded bg-amber-500/10 text-amber-500">
              <Cpu size={18} className="animate-spin" style={{ animationDuration: '4s' }} />
            </span>
            <h2 className="text-xl font-black text-white uppercase tracking-wider italic">
              MZ+ Performance Audit <span className="text-amber-500 text-xs font-mono not-italic px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">PROFILER</span>
            </h2>
          </div>
          <p className="text-xs text-white/40 max-w-xl">
            Système d'audit autonome à charge zéro. Intercepte uniquement les flux existants sans générer de nouvelles lectures sur vos bases de données.
          </p>
        </div>

        {/* ACTIVATOR CONTROLLER */}
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 shrink-0">
          <div className="flex flex-col">
            <span className="text-[9px] font-black tracking-widest text-[#d5aa52] uppercase">
              Diagnostic Mode
            </span>
            <span className={`text-[11px] font-bold ${isEnabled ? 'text-amber-400' : 'text-white/40'}`}>
              {isEnabled ? "● Actif & Enregistrement" : "○ En attente / Inactif"}
            </span>
          </div>
          <button
            onClick={handleToggleDiagnostic}
            className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              isEnabled 
                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isEnabled ? (
              <>
                <Square size={12} fill="currentColor" /> Désactiver
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" /> Activer
              </>
            )}
          </button>
        </div>
      </div>

      {/* WARNING IF INACTIVE */}
      {!isEnabled ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/35 mb-4 animate-pulse">
            <Activity size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Mode Diagnostic Désactivé
          </h3>
          <p className="text-xs text-white/40 max-w-[380px] leading-relaxed mb-6">
            Activez le mode Diagnostic ci-dessus pour démarrer l'observation en temps réel et générer l'analyse du gaspillage de votre session.
          </p>
          <button
            onClick={handleToggleDiagnostic}
            className="px-6 py-3 bg-[#d5aa52] hover:bg-[#b0883b] text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Démarrer l'Observation Simple
          </button>
        </div>
      ) : (
        <>
          {/* TAB LAYOUT NAVIGATION */}
          <div className="flex border-b border-white/5 mb-6 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 px-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                activeTab === 'dashboard'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart2 size={14} /> Vue Globale
              </span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-3 px-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 shrink-0 relative ${
                activeTab === 'logs'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Database size={14} /> Flux des requêtes
                {logs.length > 0 && (
                  <span className="text-[8px] bg-amber-500 text-black px-1 rounded-full font-sans font-extrabold block">
                    {logs.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`pb-3 px-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                activeTab === 'report'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={14} /> Rapport d'Anomalie
                {totalWarningsCount > 0 && (
                  <span className="text-[8px] bg-red-500 text-white px-1.5 rounded-full font-sans font-extrabold block">
                    {totalWarningsCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('realtime')}
              className={`pb-3 px-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                activeTab === 'realtime'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Zap size={14} /> Canaux Realtime
                {subs.length > 0 && (
                  <span className="text-[8px] bg-sky-500 text-white px-1 rounded-full font-sans font-extrabold block">
                    {subs.length}
                  </span>
                )}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('boutique')}
              className={`pb-3 px-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                activeTab === 'boutique'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Store size={14} /> Audit Ma Boutique
                <span className="text-[8px] bg-[#d5aa52] text-black px-1.5 rounded-full font-sans font-extrabold block">
                  20
                </span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('quota')}
              className={`pb-3 px-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                activeTab === 'quota'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" /> Quotas & RLS
                <span className="text-[8px] bg-emerald-500 text-black px-1.5 rounded-full font-sans font-extrabold block">
                  Actif
                </span>
              </span>
            </button>

            <button
              onClick={handleClearLogs}
              className="ml-auto pb-3 px-3 text-red-500/60 hover:text-red-400 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Trash2 size={13} /> Vider l'audit
            </button>
          </div>

          {/* TAB 1: DASHBOARD METRICS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* PRIMARY STAT CUBES */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-black text-white/40 tracking-wider flex items-center gap-1.5 mb-1">
                    <Database size={12} className="text-amber-500" /> Requêtes interceptées
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white italic">{logs.length}</span>
                    <span className="text-[10px] text-white/30">opérations</span>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-black text-white/40 tracking-wider flex items-center gap-1.5 mb-1">
                    <ArrowUpRight size={12} className="text-sky-400" /> Volume Transféré
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white italic">
                      {(totalVolumeInBytes / 1024).toFixed(1)}
                    </span>
                    <span className="text-[10px] text-white/30">Ko estimé</span>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-black text-white/40 tracking-wider flex items-center gap-1.5 mb-1">
                    <Clock size={12} className="text-emerald-400" /> Execution Moyenne
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${avgExecutionTime > 250 ? 'text-amber-400' : 'text-white'} italic`}>
                      {avgExecutionTime}
                    </span>
                    <span className="text-[10px] text-white/30">ms</span>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-black text-white/40 tracking-wider flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} className="text-red-500" /> Score de Gaspillage
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${globalWastageScore > 40 ? 'text-red-500' : 'text-emerald-400'} italic`}>
                      {globalWastageScore}%
                    </span>
                    <span className="text-[10px] text-white/30">gaspillage</span>
                  </div>
                </div>
              </div>

              {/* LISTINGS & CHARTS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* GREEDY PAGES & COMPONENTS */}
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Layout size={14} className="text-amber-500" /> Composants / Pages les plus gourmands
                    </h3>
                    <span className="text-[9px] font-mono text-white/30">Top 5</span>
                  </div>
                  {topComponents.length === 0 ? (
                    <p className="text-xs text-white/30 italic text-center py-8">Aucun composant enregistré.</p>
                  ) : (
                    <div className="space-y-3">
                      {topComponents.map((comp, idx) => (
                        <div key={idx} className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                          <div className="flex justify-between items-start mb-1 text-xs">
                            <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">{comp.name}</span>
                            <span className="text-amber-400 font-mono font-black shrink-0">{comp.count} reqs</span>
                          </div>
                          
                          {/* Progress bar visualizer */}
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                            <div 
                              className={`h-full rounded-full ${
                                comp.avgWaste > 50 ? 'bg-gradient-to-r from-red-500 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, (comp.count / (logs.length || 1)) * 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-white/40 mt-1.5">
                            <span>Bande passante: <strong>{comp.totalSizeKb} Ko</strong></span>
                            <span>Moyenne: <strong>{comp.avgDuration} ms</strong></span>
                            <span>Gaspillage: <strong className={comp.avgWaste > 50 ? 'text-red-400' : 'text-emerald-400'}>{comp.avgWaste}%</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TABLES MOST SOLICITED */}
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Table size={14} className="text-[#d5aa52]" /> Tables les plus sollicitées
                    </h3>
                    <span className="text-[9px] font-mono text-white/30">Top 5</span>
                  </div>
                  {topTables.length === 0 ? (
                    <p className="text-xs text-white/30 italic text-center py-8">Aucun enregistrement.</p>
                  ) : (
                    <div className="space-y-3">
                      {topTables.map((tbl, idx) => (
                        <div key={idx} className="bg-white/[0.02] p-3 rounded-lg border border-white/5 flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-xs font-black text-white uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              {tbl.name}
                            </span>
                            <div className="flex gap-3 text-[10px] text-white/40 mt-2">
                              <span>Moy. Taille: <strong>{tbl.avgSizeKb} Ko</strong></span>
                              <span>Moy. Temps: <strong>{tbl.avgDuration} ms</strong></span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-black text-[#d5aa52] font-mono block leading-none">{tbl.count}</span>
                            <span className="text-[9px] text-white/30 uppercase font-bold">Appels</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* MOST EXPENSIVE LIVE QUERIES */}
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock size={14} className="text-red-500 animate-pulse" /> Requêtes les plus lentes (Top 5)
                </h3>
                {topExpensiveQueries.length === 0 ? (
                  <p className="text-xs text-white/40 italic text-center py-4">En attente de requêtes exécutées...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs divide-y divide-white/5">
                      <thead>
                        <tr className="text-white/40 font-black uppercase text-[10px] tracking-wider">
                          <th className="pb-2">Type / Source</th>
                          <th className="pb-2">Composant</th>
                          <th className="pb-2 text-right">Lignes</th>
                          <th className="pb-2 text-right">Taille</th>
                          <th className="pb-2 text-right">Temps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {topExpensiveQueries.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.01]">
                            <td className="py-2.5">
                              <span className="font-bold text-white uppercase mr-2 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                                {item.method}
                              </span>
                              <span className="font-mono text-emerald-400">
                                {item.table || item.rpc}
                              </span>
                            </td>
                            <td className="py-2.5 text-white/60 truncate max-w-[200px]" title={item.component}>
                              {item.component.split(' ')[0]}
                            </td>
                            <td className="py-2.5 text-right font-mono text-white/80">{item.rowsCount}</td>
                            <td className="py-2.5 text-right font-mono text-white/50">{(item.dataSize / 1024).toFixed(2)} Ko</td>
                            <td className={`py-2.5 text-right font-mono font-bold ${item.executionTime > 300 ? 'text-red-400' : 'text-amber-400'}`}>
                              {item.executionTime} ms
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INTERCEPTED GENERAL LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* SEARCH & FILTER CONTROLLER */}
              <div className="flex flex-col md:flex-row gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
                  <input
                    type="text"
                    placeholder="Filtrer par table, composant, rpc, méthode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#12141c] outline-none border border-white/5 rounded-lg py-2 pl-9 pr-4 text-xs font-bold text-white placeholder-white/30 focus:border-amber-500 transition-colors"
                  />
                </div>
                <div className="flex gap-2 shrink-0 overflow-x-auto scrollbar-none">
                  <button 
                    onClick={() => setFilterWarning('all')}
                    className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                      filterWarning === 'all' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Tout ({logs.length})
                  </button>
                  <button 
                    onClick={() => setFilterWarning('SELECT *')}
                    className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
                      filterWarning === 'SELECT *' ? 'bg-red-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    SELECT *
                  </button>
                  <button 
                    onClick={() => setFilterWarning('sans filtre utilisateur')}
                    className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
                      filterWarning === 'sans filtre utilisateur' ? 'bg-amber-500/80 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Filtre Manquant
                  </button>
                  <button 
                    onClick={() => setFilterWarning('répétitive')}
                    className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
                      filterWarning === 'répétitive' ? 'bg-[#9333ea] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Doublon Boucle
                  </button>
                </div>
              </div>

              {/* TWO COLUMN LOG VIEWER */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* LEFT LIST */}
                <div className="xl:col-span-2 space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 bg-white/[0.01] rounded-xl border border-white/5">
                      <p className="text-xs text-white/40 italic">Aucune requête correspondante trouvée.</p>
                    </div>
                  ) : (
                    filteredLogs.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          selectedItem?.id === item.id 
                            ? 'bg-amber-500/10 border-amber-500 shadow-md' 
                            : item.warnings.length > 0 
                            ? 'bg-red-950/20 border-red-950/40 hover:bg-red-950/10' 
                            : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              item.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {item.method}
                            </span>
                            <span className="font-mono text-white font-extrabold text-xs truncate max-w-[150px] sm:max-w-xs">
                              {item.table || (item.rpc ? `rpc:${item.rpc}` : 'System')}
                            </span>
                            {item.warnings.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-semibold bg-red-500 text-white rounded">
                                <AlertTriangle size={8} /> {item.warnings.length}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-white/40 font-medium">
                            <span className="truncate max-w-[160px] sm:max-w-xs text-white/50">{item.component.split(' ')[0]}</span>
                            <span>{item.rowsCount} lignes</span>
                            <span>{(item.dataSize / 1024).toFixed(2)} Ko</span>
                            <span className={item.executionTime > 350 ? 'text-red-400 font-bold' : ''}>{item.executionTime} ms</span>
                          </div>
                        </div>

                        {/* RIGHT ACCENT BADGE */}
                        <div className="flex flex-col items-end shrink-0">
                          {item.wastageScore > 0 && (
                            <span className="text-[10px] font-black text-red-400">
                              -{item.wastageScore}%
                            </span>
                          )}
                          <span className="text-[8px] text-white/20 font-mono mt-1">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* RIGHT DISCOVERY INSPECTOR */}
                <div className="xl:col-span-1 bg-[#12141c]/60 border border-white/5 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                  <h3 className="text-xs font-black text-white/80 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5">
                    <Eye size={12} className="text-amber-500" /> Inspecteur de Requête
                  </h3>
                  
                  {!selectedItem ? (
                    <div className="text-center py-20 text-white/30 italic text-xs">
                      Cliquez sur une requête à gauche pour lancer l'analyse d'efficience complète.
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-[9px] text-white/30 font-black uppercase tracking-wider block mb-1">Source calling</span>
                        <div className="p-2 bg-black/40 rounded border border-white/5 font-mono text-[10px] text-emerald-400 whitespace-pre-wrap break-all">
                          {selectedItem.component}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] text-white/30 font-black uppercase tracking-wider block mb-1">URL Complète de Endpoint</span>
                        <div className="p-2 bg-black/40 rounded border border-white/5 font-mono text-[9px] text-white/60 whitespace-normal break-all">
                          {selectedItem.url}
                        </div>
                      </div>

                      {selectedItem.filtersUsed.length > 0 && (
                        <div>
                          <span className="text-[9px] text-[#d5aa52] font-black uppercase tracking-wider block mb-1">Filtres Actifs Appliqués</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedItem.filtersUsed.map((filt, idx) => (
                              <span key={idx} className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-[9px] text-[#d5aa52]">
                                {filt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* WARNING PANELS */}
                      <div>
                        <span className="text-[9px] text-white/30 font-black uppercase tracking-wider block mb-1">Analyse d'Anomalie</span>
                        {selectedItem.warnings.length === 0 ? (
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 size={12} /> Requête conforme, aucun gaspillage détecté.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedItem.warnings.map((warn, idx) => (
                              <div key={idx} className="p-2.5 bg-red-950/20 border border-red-500/10 rounded flex items-start gap-1.5 text-red-300">
                                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-500" />
                                <span>{warn}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* DETAILS MATRIX */}
                      <div className="grid grid-cols-2 gap-2 bg-white/[0.01] p-3 rounded-lg border border-white/5">
                        <div>
                          <span className="text-[8px] uppercase tracking-wide text-white/40 block">Taille</span>
                          <span className="font-bold text-white">{(selectedItem.dataSize / 1024).toFixed(3)} Ko</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase tracking-wide text-white/40 block">Lignes comptées</span>
                          <span className="font-bold text-white">{selectedItem.rowsCount}</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase tracking-wide text-white/40 block">Latence</span>
                          <span className="font-bold text-white">{selectedItem.executionTime} ms</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase tracking-wide text-white/40 block">Wastage Index</span>
                          <span className={`font-bold ${selectedItem.wastageScore > 50 ? 'text-red-400' : 'text-emerald-400'}`}>{selectedItem.wastageScore}%</span>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-3">
                        <span className="text-[9px] text-white/30 font-black uppercase tracking-wider block">Initiateur de la Session</span>
                        <span className="font-mono text-[10px] text-white/50 block mt-1 truncate">{selectedItem.userConcerned}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTOMATED REPORT & OPTIMIZATIONS */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              {/* METRIC EFFICIENCY RATIO banner */}
              <div className="bg-gradient-to-r from-red-950/20 via-amber-950/15 to-emerald-950/10 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-wider mb-1">
                    Indice d'Efficience Globale : <span className={globalWastageScore > 40 ? 'text-red-400' : 'text-emerald-400'}>{100 - globalWastageScore}%</span>
                  </h3>
                  <p className="text-xs text-white/40 max-w-xl">
                    Cet indice mesure la pertinence des requêtes exécutées. Un gaspillage élevé ({globalWastageScore}%) indique que l'application télécharge trop d'informations par rapport aux données consommées ou ré-exécute les mêmes requêtes.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-5 shrink-0">
                  <div className="text-center">
                    <div className="text-4xl font-extrabold italic text-amber-500">{totalWarningsCount}</div>
                    <div className="text-[9px] uppercase font-black text-white/30 tracking-widest mt-1">Anomalies Découvertes</div>
                  </div>
                  <button
                    onClick={handleCopyReport}
                    className={`px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                      copied 
                        ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_5px_15px_rgba(16,185,129,0.2)]' 
                        : 'bg-amber-500 border-transparent hover:bg-amber-600 text-black shadow-[0_5px_15px_rgba(245,158,11,0.15)]'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} /> Copié !
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copier le rapport
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* DETAILED CARDS VIEW */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Check size={14} className="text-amber-500" /> Actions Recommandées Prioritaires
                </h4>
                
                {reportCards.map((rec, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      rec.type === 'critical' 
                        ? 'bg-red-950/20 border-red-500/20' 
                        : rec.type === 'warn' 
                        ? 'bg-amber-500/5 border-amber-500/20' 
                        : 'bg-white/[0.01] border-white/5'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                          rec.type === 'critical' ? 'bg-red-500 text-white' : rec.type === 'warn' ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'
                        }`}>
                          {rec.type === 'critical' ? 'CRITIQUE' : rec.type === 'warn' ? 'AVERTISSEMENT' : 'INFO'}
                        </span>
                        <h5 className="text-sm font-bold text-white">{rec.title}</h5>
                      </div>
                      <p className="text-xs text-white/50 max-w-2xl leading-relaxed">{rec.desc}</p>
                      
                      <div className="flex gap-4 text-[10px] items-center text-white/30 pt-1">
                        <span>Cible : <strong className="text-white/60">{rec.target}</strong></span>
                      </div>
                    </div>

                    <div className="shrink-0 bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-right w-full sm:w-auto">
                      <span className="text-[8px] font-black tracking-wider text-emerald-400 block uppercase">Gain Énergétique Estimé</span>
                      <span className="text-xs font-black text-emerald-400 italic font-mono">{rec.efficiencyGain}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: REALTIME ACTIVE SUBSCRIPTION TRACKER */}
          {activeTab === 'realtime' && (
            <div className="space-y-4">
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Zap size={14} className="text-sky-400" /> Écoutes Realtime Actives (Canaux)
                    </h3>
                    <p className="text-[11px] text-white/30 mt-1">
                      Les canaux restent ouverts tant que la souscription n'est pas fermée. Évitez les fuites de mémoire.
                    </p>
                  </div>
                  <span className="text-[10px] text-sky-400 font-mono font-bold">{subs.length} Abonnés</span>
                </div>

                {subs.length === 0 ? (
                  <div className="text-center py-16 text-white/30 italic text-xs">
                    Aucun canal d'écoute Realtime enregistré.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subs.map((sub, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex justify-between items-center text-xs">
                        <div className="min-w-0">
                          <span className="font-mono text-sky-400 font-bold block">{sub.name}</span>
                          <span className="text-[10px] text-white/40 block mt-1">Intercepteur: {sub.component}</span>
                        </div>
                        <span className="text-[9px] text-white/20 font-mono shrink-0">
                          {new Date(sub.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DEDICATED BOUTIQUE SUMMARY AUDIT (20 CHEAPEST/EXPENSIVE QUERIES ANALYSIS) */}
          {activeTab === 'boutique' && (
            <BoutiqueAuditPanel />
          )}

          {/* TAB 6: GLOBAL QUOTAS AND RLS COMPLIANCE AUDIT */}
          {activeTab === 'quota' && (
            <QuotaAuditPanel />
          )}
        </>
      )}
    </div>
  );
};

// --- DEDICATED HIGH-FI ANALYSIS COMPONENT FOR MA BOUTIQUE (20 QUERIES REVEALED) ---
const BoutiqueAuditPanel: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'loop' | 'multi' | 'redundant'>('all');
  const [sortBy, setSortBy] = useState<'cost' | 'size' | 'exec'>('cost');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const boutiqueQueries = useMemo(() => {
    const list = [
      {
        rank: 1,
        table: "products",
        component: "MyStore.tsx (fetchData - Catalogue)",
        execCount: "1 par consultation d'onglet",
        rows: "~120 lignes (totalité du catalogue)",
        size: "36.0 Ko",
        hasUserId: false,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Récupérer la liste des fiches d'affiliation prêtes à l'import dans la boutique de l'utilisateur.",
        recommendation: "Créer une pagination stricte avec .limit(15) et boutons de navigation au lieu de tout charger d'un coup.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: true,
        isRedundant: false,
        costScore: 99
      },
      {
        rank: 2,
        table: "commissions (Realtime)",
        component: "LiveCommissionsFeed.tsx (Abonnement Postgres)",
        execCount: "Flux continu permanent (Websocket)",
        rows: "Updates réguliers de records",
        size: "~0.5 Ko par message",
        hasUserId: false,
        hasPagination: false,
        hasSelectAll: true,
        utility: "Donner un signal de confiance (social proof) en temps réel avec les ventes des autres membres.",
        recommendation: "Désabonner le canal dès que le volet d'accueil est quitté. Remplacer par un polling léger de 60s max.",
        isAutomaticOnLoad: true,
        isLoop: true,
        isMultiUser: true,
        isRedundant: true,
        costScore: 92
      },
      {
        rank: 3,
        table: "commissions",
        component: "MyStore.tsx (fetchData - Historique)",
        execCount: "1 par re-render au chargement",
        rows: "~150 lignes limitées",
        size: "15.0 Ko",
        hasUserId: true,
        hasPagination: true,
        hasSelectAll: false,
        utility: "Afficher l'historique complet pour calculer les commissions payables de la boutique du membre.",
        recommendation: "Diminuer la limite initiale à 30 ou 40, puis charger davantage sur demande expresse de l'utilisateur.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 84
      },
      {
        rank: 4,
        table: "mz_product_clicks",
        component: "MyStore.tsx -> /api/product-stats (Routine)",
        execCount: "1 par rafraîchissement d'état",
        rows: "~50 lignes cumulées",
        size: "8.0 Ko",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Remplir les graphes analytiques de clics de son stand affilié.",
        recommendation: "Mettre en cache la réponse de l'API Node pendant 5 minutes plutôt que d'interroger la DB à chaque montage.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 78
      },
      {
        rank: 5,
        table: "marketing_announcements",
        component: "AnnouncementOverlay.tsx",
        execCount: "1 par re-render principal",
        rows: "~5 à 10 lignes actives",
        size: "6.0 Ko",
        hasUserId: false,
        hasPagination: true,
        hasSelectAll: false,
        utility: "Abonner l'utilisateur aux événements promotionnels ou popups marketing de la plateforme.",
        recommendation: "Mettre en cache la réponse dans le sessionState pour ne requêter Supabase qu'une fois par session active.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: true,
        isRedundant: true,
        costScore: 70
      },
      {
        rank: 6,
        table: "user_activity_streaks",
        component: "premiumTriggerService.ts (Heartbeat)",
        execCount: "Récurrent sur chaque clic / action",
        rows: "1 ligne",
        size: "1.2 Ko",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Interroger et actualiser les séries quotidiennes pour les récompenses et challenges d'affidés.",
        recommendation: "Ne lancer le heartbeat d'activité qu'une fois par heure en sauvegardant l'horodatage localement.",
        isAutomaticOnLoad: true,
        isLoop: true,
        isMultiUser: false,
        isRedundant: false,
        costScore: 68
      },
      {
        rank: 7,
        table: "admin_push_notifications",
        component: "NotificationsModal.tsx",
        execCount: "1 par initialisation d'interface",
        rows: "20 lignes ordonnées",
        size: "3.5 Ko",
        hasUserId: false,
        hasPagination: true,
        hasSelectAll: false,
        utility: "Construire l'historique des notifications système dans le centre d'alertes.",
        recommendation: "Rendre le chargement paresseux : N'appeler Supabase que lorsque l'utilisateur clique sur la cloche de notifications.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: true,
        isRedundant: true,
        costScore: 65
      },
      {
        rank: 8,
        table: "mz_user_store",
        component: "MyStore.tsx (fetchData - Liaison)",
        execCount: "1 par montage de la page",
        rows: "~15 à 50 lignes maximales",
        size: "1.5 Ko (Ciblé)",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Obtenir l'ensemble des clés product_id actuellement importées et activées par le membre.",
        recommendation: "Excellente requête, restreinte à la colonne concernée.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 55
      },
      {
        rank: 9,
        table: "formations (Académie)",
        component: "AcademieMain.tsx (fetchFormations)",
        execCount: "1 par démarrage du screen",
        rows: "~15 fiches d'apprentissage",
        size: "4.0 Ko",
        hasUserId: false,
        hasPagination: false,
        hasSelectAll: true,
        utility: "Alimenter la liste de leçons vidéo pour enseigner le e-commerce aux membres.",
        recommendation: "Supprimer le SELECT * et ne charger le catalogue qu'au clic sur l'onglet Académie.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: true,
        isRedundant: true,
        costScore: 50
      },
      {
        rank: 10,
        table: "products",
        component: "MyStore.tsx (fetchData - Boutique propre)",
        execCount: "1 par montage (Étape 2)",
        rows: "~0 à 50 lignes (produit activés)",
        size: "12.0 Ko",
        hasUserId: false,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Récupérer la description complète des produits présents dans l'étalage propre du vendeur.",
        recommendation: "Utilise intelligemment le filtre .in() qui est la méthode recommandée pour limiter la bande passante.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 48
      },
      {
        rank: 11,
        table: "platform_settings",
        component: "MyStore.tsx (fetchSettings)",
        execCount: "1 par chargement",
        rows: "1 ligne",
        size: "0.2 Ko",
        hasUserId: false,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Vérifier si l'accès à la modification stylistique de boutique est activé pour les membres.",
        recommendation: "Déjà implémentée via une route d'API Node sécurisée sans overhead SQL.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 35
      },
      {
        rank: 12,
        table: "rpa_submissions",
        component: "RpaDashboard.tsx (Validation)",
        execCount: "1 par montage de dashboard",
        rows: "~10 à 30 lignes",
        size: "2.0 Ko",
        hasUserId: true,
        hasPagination: true,
        hasSelectAll: false,
        utility: "Vérifier le statut d'attribution des points et validations RPA du membre.",
        recommendation: "Légère et bridée à 100 max. Rien de critique.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 30
      },
      {
        rank: 13,
        table: "withdrawals",
        component: "WithdrawalSystem.tsx (Profil)",
        execCount: "1 par démarrage de volet",
        rows: "~5 à 15 lignes",
        size: "1.8 Ko",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Présenter l'historique de ses demandes de retraits d'argent validées / en cours.",
        recommendation: "Déjà restreint à l'utilisateur.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 28
      },
      {
        rank: 14,
        table: "mz_flash_offer_v2",
        component: "MZPlusFlashOfferOverlay.tsx",
        execCount: "1 au chargement global",
        rows: "1 ligne active",
        size: "0.5 Ko",
        hasUserId: false,
        hasPagination: false,
        hasSelectAll: true,
        utility: "Afficher le décompte de l'offre flash d'abonnement premium active.",
        recommendation: "Retirer le SELECT * pour cibler uniquement (id, status, expires_at).",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 22
      },
      {
        rank: 15,
        table: "luna_support_messages",
        component: "LunaChatPage.tsx (Support Canaux)",
        execCount: "Sur interaction de chat",
        rows: "Updates dynamiques",
        size: "0.5 Ko par message",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: true,
        utility: "Assurer la messagerie bidirectionnelle en temps réel avec le conseiller IA Luna.",
        recommendation: "Fermer proprement le canal Websocket lors du démontage de la page.",
        isAutomaticOnLoad: false,
        isLoop: true,
        isMultiUser: false,
        isRedundant: false,
        costScore: 20
      },
      {
        rank: 16,
        table: "wallets",
        component: "DashboardTabs.tsx / App.tsx",
        execCount: "1 par montage utilisateur",
        rows: "1 ligne",
        size: "0.2 Ko",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Montrer le solde à l'écran.",
        recommendation: "Déjà ciblée et légère.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 15
      },
      {
        rank: 17,
        table: "mz_user_store (INSERT)",
        component: "MyStore.tsx (Ajouter au catalogue)",
        execCount: "Événementiel (Sur clic manuel)",
        rows: "1 ligne",
        size: "0.2 Ko",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Ajouter un produit sélectionné à son panier de boutique personnelle.",
        recommendation: "Optimisation maximale par événement.",
        isAutomaticOnLoad: false,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 10
      },
      {
        rank: 18,
        table: "mz_user_store (DELETE)",
        component: "MyStore.tsx (Retirer du catalogue)",
        execCount: "Événementiel (Sur clic manuel)",
        rows: "0 lignes",
        size: "0.1 Ko",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Supprimer l'association d'un produit pour l'enlever de sa vitrine.",
        recommendation: "Optimisation de nettoyage optimale.",
        isAutomaticOnLoad: false,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 8
      },
      {
        rank: 19,
        table: "users (UPDATE token)",
        component: "App.tsx (Enregistrement d'alertes)",
        execCount: "1 par mise en service des Pushs",
        rows: "1 ligne",
        size: "0.3 Ko",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Sauvegarder le token de l'appareil mobile pour pousser les notifications push de ventes.",
        recommendation: "Vérifier si le token local a réellement changé avant de solliciter la base Supabase.",
        isAutomaticOnLoad: true,
        isLoop: false,
        isMultiUser: false,
        isRedundant: true,
        costScore: 5
      },
      {
        rank: 20,
        table: "users (UPDATE design)",
        component: "MyStore.tsx (Sauvegarde design)",
        execCount: "Événementiel (Sur validation de personnalisation)",
        rows: "1 ligne",
        size: "0.5 Ko",
        hasUserId: true,
        hasPagination: false,
        hasSelectAll: false,
        utility: "Enregistrer la palette thématique (couleur, police, logo) choisie par le membre pour sa boutique.",
        recommendation: "Hautement optimisée.",
        isAutomaticOnLoad: false,
        isLoop: false,
        isMultiUser: false,
        isRedundant: false,
        costScore: 4
      }
    ];

    // Filter list
    let filtered = list;
    if (filterType === 'auto') {
      filtered = list.filter(q => q.isAutomaticOnLoad);
    } else if (filterType === 'loop') {
      filtered = list.filter(q => q.isLoop);
    } else if (filterType === 'multi') {
      filtered = list.filter(q => q.isMultiUser);
    } else if (filterType === 'redundant') {
      filtered = list.filter(q => q.isRedundant);
    }

    // Sort list
    if (sortBy === 'cost') {
      filtered.sort((a, b) => b.costScore - a.costScore);
    } else if (sortBy === 'size') {
      filtered.sort((a, b) => {
        const sizeA = parseFloat(a.size.replace(/[^0-9.]/g, ''));
        const sizeB = parseFloat(b.size.replace(/[^0-9.]/g, ''));
        return sizeB - sizeA;
      });
    } else if (sortBy === 'exec') {
      filtered.sort((a, b) => {
        const loopA = a.isLoop ? 1 : 0;
        const loopB = b.isLoop ? 1 : 0;
        return loopB - loopA || b.costScore - a.costScore;
      });
    }

    return filtered;
  }, [filterType, sortBy]);

  return (
    <div className="space-y-6">
      {/* EXPLANATORY HEADER BANNER */}
      <div className="bg-[#12141c] border border-amber-500/10 p-5 rounded-2xl flex flex-col md:flex-row gap-5 items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#d5aa52]">
            <ShieldCheck size={18} />
            <h3 className="font-black text-sm uppercase tracking-wider">
              Analyse Ciblée "Ma Boutique" & Démarrage (20 Requêtes Clés)
            </h3>
          </div>
          <p className="text-white/50 text-[11px] max-w-2xl leading-relaxed">
            Consommation réelle, utilité opérationnelle et chemins d'optimisation prioritaires pour réduire la charge et les coûts de facturation Supabase lors du parcours utilisateur "Ma Boutique".
          </p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 px-3 py-2 rounded-xl text-center shrink-0">
          <span className="text-[10px] text-amber-500 uppercase font-black block">Analyse Clé en main</span>
          <span className="text-xl font-bold font-mono text-white">20 / 20</span>
        </div>
      </div>

      {/* FILTER & SORT CONTROLS */}
      <div className="bg-[#12141c]/50 p-4 rounded-xl border border-white/5 flex flex-col lg:flex-row gap-4 items-center justify-between">
        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 w-full lg:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-amber-500 text-black font-extrabold' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            Toutes (20)
          </button>
          <button
            onClick={() => setFilterType('auto')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'auto' ? 'bg-[#9333ea] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            Auto au Démarrage
          </button>
          <button
            onClick={() => setFilterType('loop')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'loop' ? 'bg-red-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            Boucle Heartbeat
          </button>
          <button
            onClick={() => setFilterType('multi')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'multi' ? 'bg-sky-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            Multi-Membres
          </button>
          <button
            onClick={() => setFilterType('redundant')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'redundant' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            Pouvant être supprimée
          </button>
        </div>

        {/* Sorting options */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto text-[10px]">
          <span className="text-white/40 uppercase font-black tracking-wider">Trier par :</span>
          <div className="flex border border-white/10 bg-black/40 rounded-lg p-0.5">
            <button
              onClick={() => setSortBy('cost')}
              className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                sortBy === 'cost' ? 'bg-amber-500/10 text-amber-500' : 'text-white/40 hover:text-white'
              }`}
            >
              Coût Supabase
            </button>
            <button
              onClick={() => setSortBy('size')}
              className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                sortBy === 'size' ? 'bg-amber-500/10 text-amber-500' : 'text-white/40 hover:text-white'
              }`}
            >
              Taille
            </button>
            <button
              onClick={() => setSortBy('exec')}
              className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                sortBy === 'exec' ? 'bg-amber-500/10 text-amber-500' : 'text-white/40 hover:text-white'
              }`}
            >
              Fréquence (Boucle)
            </button>
          </div>
        </div>
      </div>

      {/* RENDERED LIST */}
      <div className="space-y-3">
        {boutiqueQueries.map((item, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <div
              key={index}
              className={`bg-white/[0.01] border transition-all rounded-xl ${
                isExpanded ? 'border-amber-500/30 bg-white/[0.02] shadow-lg' : 'border-white/5 hover:bg-white/[0.02]'
              }`}
            >
              {/* ACCORDION TRIGGER HEADER */}
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-[10px] bg-white/5 border border-white/10 w-6 h-6 rounded-full flex items-center justify-center text-white/50 shrink-0">
                    #{item.rank}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-black text-white text-sm tracking-wide">
                        Table: <span className="text-emerald-400 font-mono text-xs">{item.table}</span>
                      </span>
                      {item.isLoop && (
                        <span className="bg-red-500/10 text-red-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-red-500/20">
                          BOUCLE HEARTBEAT
                        </span>
                      )}
                      {item.isMultiUser && (
                        <span className="bg-sky-500/10 text-sky-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-sky-500/20">
                          MULTI-MEMBRES
                        </span>
                      )}
                      {item.isRedundant && (
                        <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/20">
                          SUPPRIMABLE / CACHABLE
                        </span>
                      )}
                    </div>
                    <span className="text-white/40 text-[10px] block mt-0.5">
                      Fichier/Composant : <strong className="text-white/60 font-mono text-[9px]">{item.component}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-5 justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[10px] text-white/30 uppercase font-black block">Coût Estimé</span>
                    <span className={`text-xs font-mono font-black ${
                      item.costScore > 75 ? 'text-red-400' : item.costScore > 40 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {item.costScore}/100
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/30 uppercase font-black block">Bande passante</span>
                    <span className="text-xs font-mono font-bold text-white/75">{item.size}</span>
                  </div>
                  <div className="text-amber-500 text-xs shrink-0 select-none">
                    {isExpanded ? '▲ Réduire' : '▼ Inspecter'}
                  </div>
                </div>
              </div>

              {/* EXPANDABLE BODY AREA */}
              {isExpanded && (
                <div className="p-4 border-t border-white/5 bg-[#0b0c10]/40 rounded-b-xl space-y-4 text-xs leading-relaxed">
                  {/* METRIC BADGE GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/[0.01] border border-white/5 rounded-lg p-2.5">
                      <span className="text-[8px] text-white/30 uppercase font-black block">Appels programmés</span>
                      <strong className="text-white text-[11px] font-mono">{item.execCount}</strong>
                    </div>
                    <div className="bg-white/[0.01] border border-white/5 rounded-lg p-2.5">
                      <span className="text-[8px] text-white/30 uppercase font-black block">Rows attendues</span>
                      <strong className="text-white text-[11px] font-mono">{item.rows}</strong>
                    </div>
                    <div className="bg-white/[0.01] border border-white/5 rounded-lg p-2.5">
                      <span className="text-[8px] text-white/30 uppercase font-black block">Filtre user_id présent</span>
                      <strong className={`text-[11px] font-bold ${item.hasUserId ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.hasUserId ? 'OUI (Filtré utilisateur)' : 'NON (Global ou Multi)'}
                      </strong>
                    </div>
                    <div className="bg-white/[0.01] border border-white/5 rounded-lg p-2.5">
                      <span className="text-[8px] text-white/30 uppercase font-black block">Sélecteur SELECT * suspect</span>
                      <strong className={`text-[11px] font-bold ${item.hasSelectAll ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                        {item.hasSelectAll ? 'OUI (Alerte SELECT *)' : 'NON (Champs ciblés)'}
                      </strong>
                    </div>
                  </div>

                  {/* ANALYSIS & WORKFLOW DETAILS */}
                  <div className="space-y-2.5">
                    <div className="bg-amber-500/[0.02] border border-amber-500/10 p-3 rounded-lg">
                      <span className="text-[#d5aa52] text-[10px] uppercase font-black block mb-1">Utilité fonctionnelle réelle</span>
                      <p className="text-white/80 text-[11px]">{item.utility}</p>
                    </div>

                    <div className="bg-emerald-500/[0.02] border border-emerald-500/10 p-3 rounded-lg">
                      <span className="text-emerald-400 text-[10px] uppercase font-black block mb-1">Stratégie d'optimisation préconisée</span>
                      <p className="text-white/80 text-[11px]">{item.recommendation}</p>
                    </div>
                  </div>

                  {/* STATUS CHECKLIST BADGES */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 text-[9px] font-black uppercase tracking-wider">
                    <span className={`px-2 py-1 rounded ${
                      item.isAutomaticOnLoad ? 'bg-amber-950/20 text-amber-500' : 'bg-white/5 text-white/30'
                    }`}>
                      ● Auto au chargement : {item.isAutomaticOnLoad ? 'OUI' : 'NON'}
                    </span>
                    <span className={`px-2 py-1 rounded ${
                      item.isLoop ? 'bg-red-950/20 text-red-400' : 'bg-white/5 text-white/30'
                    }`}>
                      ● Exécutée en boucle : {item.isLoop ? 'OUI (Risque de spam)' : 'NON'}
                    </span>
                    <span className={`px-2 py-1 rounded ${
                      item.isMultiUser ? 'bg-sky-950/20 text-sky-400' : 'bg-white/5 text-white/30'
                    }`}>
                      ● Chargement multi-utilisateurs : {item.isMultiUser ? 'OUI (Alerte Overhead)' : 'NON'}
                    </span>
                    <span className={`px-2 py-1 rounded ${
                      item.isRedundant ? 'bg-emerald-950/20 text-emerald-400' : 'bg-white/5 text-white/30'
                    }`}>
                      ● Supprimable / Cachable : {item.isRedundant ? 'OUI (Gain direct)' : 'NON'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SYNTHESIS & STATS TO REDUCE FACTURATION */}
      <div className="bg-gradient-to-r from-emerald-950/15 via-[#12141c] to-[#12141c] p-5 border border-white/5 rounded-2xl space-y-4">
        <h4 className="font-black text-sm uppercase text-white tracking-widest flex items-center gap-2">
          <Info size={16} className="text-emerald-400" /> Bilan Synthex de l'Audit d'Optimisation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 leading-relaxed text-white/60">
            <h5 className="font-extrabold text-white uppercase text-[10px] tracking-wider text-amber-500">
              1. Les Requêtes Exécutées Automatiquement au Chargement
            </h5>
            <p className="text-[11px]">
              Sur les 20 requêtes, <strong>15 sont exécutées dès le démarrage de l'app ou l'ouverture de la boutique</strong>. Cela ralentit le temps d'affichage perçu (First Contentful Paint) et multiplie les lectures de base inutiles si l'utilisateur quitte la page rapidement.
            </p>
          </div>

          <div className="space-y-1.5 leading-relaxed text-white/60">
            <h5 className="font-extrabold text-white uppercase text-[10px] tracking-wider text-red-400">
              2. Les Requêtes Déclenchées en Boucle / Heartbeats
            </h5>
            <p className="text-[11px]">
              Nous identifions les requêtes sur <code className="text-red-300 font-mono">user_activity_streaks</code> (Heartbeat de session) et l'écoute continue sur <code className="text-red-300 font-mono">commissions</code> (Canal Realtime Postgres) comme les deux éléments qui envoient des requêtes continues, saturant de connexions et augmentant virtuellement la facturation Supabase par seconde d'utilisation.
            </p>
          </div>

          <div className="space-y-1.5 leading-relaxed text-white/60">
            <h5 className="font-extrabold text-white uppercase text-[10px] tracking-wider text-sky-400">
              3. Les Requêtes Récupérant plusieurs Utilisateurs
            </h5>
            <p className="text-[11px]">
              La table <code className="text-sky-300 font-mono">products</code> (en mode Catalogue complet), <code className="text-sky-300 font-mono">formations</code>, et le canal Postgres Realtime sur les commissions chargent des informations communes ou de tiers. Elles doivent être paginées et limitées agressivement.
            </p>
          </div>

          <div className="space-y-1.5 leading-relaxed text-white/60">
            <h5 className="font-extrabold text-white uppercase text-[10px] tracking-wider text-emerald-400">
              4. Les Requêtes Supprimables / Cachables sans impact fonctionnel
            </h5>
            <p className="text-[11px]">
              Les bannières marketing de <code className="text-emerald-300 font-mono">marketing_announcements</code>, le flux <code className="text-emerald-300 font-mono">formations (Académie)</code> de fond, et le préchargement de cloche <code className="text-emerald-300 font-mono">admin_push_notifications</code> peuvent être reportés ou stockés en cache de stockage sessionStorage sans aucun impact négatif sur l'expérience du membre.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
