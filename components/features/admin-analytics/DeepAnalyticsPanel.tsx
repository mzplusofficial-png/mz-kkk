import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, Crown, DollarSign, Wallet, ShieldCheck, 
  Clock, Target, CheckCircle2, RefreshCw, Layers, 
  Award, Flame, UserPlus, HeartHandshake, CheckSquare, 
  Activity, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { supabase } from '../../../services/supabase.ts';
import { UserProfile } from '../../../types.ts';
import { SectionTitle, GoldText, PurpleText } from '../../UI.tsx';

// Simple representation of the live statistics
interface LiveStats {
  totalUsers: number;
  usersPremium: number;
  usersStandard: number;
  totalSalesCount: number;
  totalSalesVolume: number;
  pendingSalesCount: number;
  totalPayoutsApproved: number;
  pendingPayoutsCount: number;
  totalMinutesSpent: number;
  completedJ1: number;
  completedJ2: number;
  completedJ3: number;
  recentLogs: any[];
  userRegistry: Record<string, { name: string, email: string }>;
  activeUsersTodayCount: number;
  minutesTodayTotal: number;
  activeUsersYesterdayCount: number;
  minutesYesterdayTotal: number;
}

type AnalyticsTab = 'global' | 'sales' | 'activities' | 'challenges' | 'help';

export const DeepAnalyticsPanel: React.FC<{ 
  adminProfile: UserProfile | null;
}> = ({ adminProfile }) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('global');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const [stats, setStats] = useState<LiveStats>({
    totalUsers: 0,
    usersPremium: 0,
    usersStandard: 0,
    totalSalesCount: 0,
    totalSalesVolume: 0,
    pendingSalesCount: 0,
    totalPayoutsApproved: 0,
    pendingPayoutsCount: 0,
    totalMinutesSpent: 0,
    completedJ1: 0,
    completedJ2: 0,
    completedJ3: 0,
    recentLogs: [],
    userRegistry: {},
    activeUsersTodayCount: 0,
    minutesTodayTotal: 0,
    activeUsersYesterdayCount: 0,
    minutesYesterdayTotal: 0
  });

  const getLocalDateString = (deltaDays = 0) => {
    const d = new Date();
    if (deltaDays !== 0) d.setDate(d.getDate() + deltaDays);
    return d.toISOString().split('T')[0];
  };

  const [selectedActivityDate, setSelectedActivityDate] = useState<string>(getLocalDateString(0));
  const [activeUsersOnDate, setActiveUsersOnDate] = useState<any[]>([]);
  const [loadingDateDetails, setLoadingDateDetails] = useState<boolean>(false);

  const fetchUsersForDate = useCallback(async (targetDate: string) => {
    setLoadingDateDetails(true);
    try {
      const { data, error } = await supabase
        .from('mz_rewards_time_tracking')
        .select('user_id, total_minutes, last_ping')
        .eq('tracking_date', targetDate)
        .order('last_ping', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = Array.from(new Set(data.map((item: any) => item.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profiles, error: pErr } = await supabase
            .from('users')
            .select('id, full_name, email')
            .in('id', userIds);
            
          if (!pErr && profiles) {
            setStats(prev => {
              const nextRegistry = { ...prev.userRegistry };
              profiles.forEach((p: any) => {
                nextRegistry[p.id] = { name: p.full_name || 'Ambassadeur Anonyme', email: p.email || 'Sans adresse email' };
              });
              return { ...prev, userRegistry: nextRegistry };
            });
          }
        }
      }

      setActiveUsersOnDate(data || []);
    } catch (err) {
      console.error("Error fetching day details:", err);
    } finally {
      setLoadingDateDetails(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'activities') {
      fetchUsersForDate(selectedActivityDate);
    }
  }, [selectedActivityDate, activeTab, fetchUsersForDate]);

  const fetchLiveDatabaseMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const safeQuery = async (promise: any, fallbackData: any = []) => {
        try {
          const res = await promise;
          if (res.error) {
            console.warn("Non-critical query error bypassed in DeepAnalyticsPanel:", res.error);
            return { data: fallbackData, count: res.count || 0, error: null };
          }
          return res;
        } catch (e) {
          console.warn("Query exception bypassed in DeepAnalyticsPanel:", e);
          return { data: fallbackData, count: 0, error: null };
        }
      };

      // 1. Fetch Users stats using head=true counts instead of grabbing all objects (huge egress savings!)
      const { count: totalUsersCount } = await safeQuery(
        supabase.from('users').select('id', { count: 'exact', head: true }),
        null
      );
      const { count: premiumUsersCount } = await safeQuery(
        supabase.from('users').select('id', { count: 'exact', head: true }).in('user_level', ['premium', 'elite', 'legend', 'niveau_mz_plus']),
        null
      );

      const totalUsers = totalUsersCount || 0;
      const usersPremium = premiumUsersCount || 0;
      const usersStandard = Math.max(0, totalUsers - usersPremium);

      // 2. Fetch Commissions (Sales) - selecting individual columns
      const { data: commsData } = await safeQuery(supabase
        .from('commissions')
        .select('id, amount, status, created_at, user_id'));

      const approvedComms = commsData?.filter((c: any) => c.status === 'approved' || c.status === 'finalized') || [];
      const totalSalesCount = approvedComms.length;
      const totalSalesVolume = approvedComms.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
      const pendingSalesCount = commsData?.filter((c: any) => c.status === 'pending').length || 0;

      // 3. Fetch Withdrawals (Payouts)
      const { data: withsData } = await safeQuery(supabase
        .from('withdrawals')
        .select('id, amount, status'));

      const totalPayoutsApproved = withsData?.filter((w: any) => w.status === 'approved' || w.status === 'finalized')
        .reduce((acc: number, w: any) => acc + (Number(w.amount) || 0), 0) || 0;
      const pendingPayoutsCount = withsData?.filter((w: any) => w.status === 'pending').length || 0;

      // 4. Fetch Time Activity Sum
      const { data: actData } = await safeQuery(supabase
        .from('mz_admin_activity_summary')
        .select('minutes_total, minutes_today'));

      const totalMinutesSpent = actData?.reduce((acc: number, s: any) => acc + (Number(s.minutes_total || s.total_minutes || 0)), 0) || 0;

      // Fetch Today and Yesterday metrics
      const todayStr = getLocalDateString(0);
      const yesterdayStr = getLocalDateString(-1);

      // Today tracking
      const { data: todayTracking } = await safeQuery(supabase
        .from('mz_rewards_time_tracking')
        .select('user_id, total_minutes')
        .eq('tracking_date', todayStr));

      const activeUsersTodayCount = todayTracking?.length || 0;
      const minutesTodayTotal = todayTracking?.reduce((sum: number, item: any) => sum + (Number(item.total_minutes) || 0), 0) || 0;

      // Yesterday tracking
      const { data: yesterdayTracking } = await safeQuery(supabase
        .from('mz_rewards_time_tracking')
        .select('user_id, total_minutes')
        .eq('tracking_date', yesterdayStr));

      const activeUsersYesterdayCount = yesterdayTracking?.length || 0;
      const minutesYesterdayTotal = yesterdayTracking?.reduce((sum: number, item: any) => sum + (Number(item.total_minutes) || 0), 0) || 0;

      // 5. Fetch 3-Day Challenges states
      const { data: challData } = await safeQuery(supabase
        .from('mz_challenge_3j_state')
        .select('j1_completed, j2_completed, j3_completed'));

      const completedJ1 = challData?.filter((c: any) => c.j1_completed).length || 0;
      const completedJ2 = challData?.filter((c: any) => c.j2_completed).length || 0;
      const completedJ3 = challData?.filter((c: any) => c.j3_completed).length || 0;

      // 6. Selective Fetch profile details ONLY for active or logged users to render names and emails
      const neededUserIds = new Set<string>();
      const recentCommsList = commsData || [];
      const todayTrackingList = todayTracking || [];
      const yesterdayTrackingList = yesterdayTracking || [];

      recentCommsList.slice(0, 15).forEach((c: any) => { if (c.user_id) neededUserIds.add(c.user_id); });
      todayTrackingList.forEach((item: any) => { if (item.user_id) neededUserIds.add(item.user_id); });
      yesterdayTrackingList.forEach((item: any) => { if (item.user_id) neededUserIds.add(item.user_id); });

      const userRegistry: Record<string, { name: string, email: string }> = {};
      const userMap = new Map();

      if (neededUserIds.size > 0) {
        const { data: profiles } = await safeQuery(supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', Array.from(neededUserIds)));

        if (profiles) {
          profiles.forEach((p: any) => {
            const name = p.full_name || 'Ambassadeur Anonyme';
            const email = p.email || 'Sans adresse email';
            userRegistry[p.id] = { name, email };
            userMap.set(p.id, name);
          });
        }
      }

      // 7. Recent real logs from commissions for instant visual reassurance
      const recentLogs = recentCommsList
        .slice(0, 10)
        .map((c: any) => ({
          id: c.id,
          userName: userMap.get(c.user_id) || 'Ambassadeur',
          amount: c.amount,
          status: c.status,
          date: c.created_at
        }));

      setStats({
        totalUsers,
        usersPremium,
        usersStandard,
        totalSalesCount,
        totalSalesVolume,
        pendingSalesCount,
        totalPayoutsApproved,
        pendingPayoutsCount,
        totalMinutesSpent,
        completedJ1,
        completedJ2,
        completedJ3,
        recentLogs,
        userRegistry,
        activeUsersTodayCount,
        minutesTodayTotal,
        activeUsersYesterdayCount,
        minutesYesterdayTotal
      });
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Live metrics error:", err);
      setError("Impossible de synchroniser le tableau en direct. S'il s'agit d'une table indisponible, elle est en cours d'initialisation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDatabaseMetrics();
  }, [fetchLiveDatabaseMetrics]);

  // Format functions to make it easy for anyone to read
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
  };

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} minutes`;
    return `${hours}h et ${mins}m`;
  };

  return (
    <div className="p-6 md:p-8 space-y-8 text-white">
      {/* Top Header Row with Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider flex items-center gap-3">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">📊</span>
            Analyse <GoldText>MZ+ Réelle & Simplifiée</GoldText>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">Données 100% réelles extraites instantanément de la base de données de l'application.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Statut des données</p>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] text-emerald-400 font-bold tracking-tight">Synchronisé à {lastUpdated.toLocaleTimeString('fr-FR')}</p>
            </div>
          </div>

          <button
            onClick={fetchLiveDatabaseMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all duration-200 transform active:scale-95 shadow-lg shadow-emerald-500/10"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Mise à jour...' : 'Actualiser'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/20 text-red-200 text-xs rounded-2xl flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Simplified Main Scorebar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative group overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 text-8xl shrink-0 group-hover:scale-110 transition-transform">👥</div>
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Membres inscrits</p>
          <p className="text-3xl font-black text-white font-mono mt-1">{loading ? '...' : stats.totalUsers}</p>
          <p className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1 font-black">
            <Crown size={11} /> {stats.usersPremium} Membres VIP (Premium)
          </p>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative group overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 text-8xl shrink-0 group-hover:scale-110 transition-transform">💰</div>
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Ventes Totales validées</p>
          <p className="text-3xl font-black text-amber-400 font-mono mt-1">{loading ? '...' : formatMoney(stats.totalSalesVolume)}</p>
          <p className="text-[10px] text-neutral-500 mt-2 flex items-center gap-1">
            🎯 {stats.totalSalesCount} commandes enregistrées
          </p>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative group overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 text-8xl shrink-0 group-hover:scale-110 transition-transform">⏱️</div>
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Durée totale d'onboarding</p>
          <p className="text-xl md:text-2xl font-black text-sky-400 font-mono mt-2 truncate">{loading ? '...' : formatHours(stats.totalMinutesSpent)}</p>
          <p className="text-[10px] text-neutral-500 mt-2 flex items-center gap-1">
            ⚡ Travail cumulé de la communauté
          </p>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 relative group overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 text-8xl shrink-0 group-hover:scale-110 transition-transform">🏅</div>
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Défis terminés (J3)</p>
          <p className="text-3xl font-black text-purple-400 font-mono mt-1">{loading ? '...' : stats.completedJ3}</p>
          <p className="text-[10px] text-neutral-500 mt-2 flex items-center gap-1">
            🏁 Objectif final de conversion
          </p>
        </div>
      </div>

      {/* Clean Tab Selector */}
      <div className="flex flex-wrap border-b border-white/5 pb-2 gap-2">
        <button
          onClick={() => setActiveTab('global')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'global' ? 'bg-white/10 text-white border border-white/10' : 'text-neutral-500 hover:text-white'
          }`}
        >
          <span>🌍</span> Synthèse Générale
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'sales' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-neutral-500 hover:text-white'
          }`}
        >
          <span>💰</span> Ventes & Finances
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'activities' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-neutral-500 hover:text-white'
          }`}
        >
          <span>⏱️</span> Activité & Présence
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'challenges' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-neutral-500 hover:text-white'
          }`}
        >
          <span>🏅</span> Entonnoir des Défis
        </button>
        <button
          onClick={() => setActiveTab('help')}
          className={`ml-auto px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 text-neutral-500 hover:text-white`}
        >
          <HelpCircle size={14} /> Comment ça marche ?
        </button>
      </div>

      {/* Dynamic Tab Renderings */}
      <div className="bg-[#0c0c0c] border border-white/5 rounded-[2rem] p-6 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="animate-spin text-emerald-400" size={36} />
            <p className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Lecture en cours de la base de données...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: SYNTHESE GENERALE */}
            {activeTab === 'global' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-black uppercase text-white tracking-tight flex items-center gap-2">
                    <span className="text-emerald-400">●</span> Vue Globale du Système
                  </h3>
                  <p className="text-xs text-neutral-500">Un tableau simplifié montrant l'état de santé de l'Académie.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Section: Community Distribution */}
                  <div className="bg-neutral-900/30 p-6 rounded-2xl border border-white/5 space-y-6">
                    <h4 className="text-xs font-bold uppercase text-neutral-400 tracking-wider">Distribution des Ambassadeurs</h4>
                    
                    <div className="space-y-4">
                      {/* Premium Row */}
                      <div>
                        <div className="flex justify-between text-xs font-black uppercase mb-1.5">
                          <span className="flex items-center gap-1 text-emerald-400"><Crown size={12} fill="currentColor" /> VIP Premium + Élite</span>
                          <span>{stats.usersPremium} membres ({stats.totalUsers > 0 ? Math.round((stats.usersPremium / stats.totalUsers) * 100) : 0}%)</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" 
                            style={{ width: `${stats.totalUsers > 0 ? (stats.usersPremium / stats.totalUsers) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Standard Row */}
                      <div>
                        <div className="flex justify-between text-xs font-black uppercase mb-1.5">
                          <span className="flex items-center gap-1 text-neutral-400"><Users size={12} /> Standard Gratuit</span>
                          <span>{stats.usersStandard} membres ({stats.totalUsers > 0 ? Math.round((stats.usersStandard / stats.totalUsers) * 100) : 0}%)</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#1e1e1e] rounded-full transition-all duration-1000" 
                            style={{ width: `${stats.totalUsers > 0 ? (stats.usersStandard / stats.totalUsers) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/15">
                      <p className="text-[10px] text-emerald-400 leading-relaxed font-black uppercase tracking-wider">🎯 Analyse de conversion relative :</p>
                      <p className="text-xs text-neutral-300 mt-1">
                        Sur {stats.totalUsers} inscrits au total, vous convertissez <strong>{stats.totalUsers > 0 ? ((stats.usersPremium / stats.totalUsers) * 100).toFixed(1) : 0}%</strong> de votre audience en membres payants. C'est un excellent ratio d'engagement !
                      </p>
                    </div>
                  </div>

                  {/* Right Section: Core Tasks and validation states */}
                  <div className="bg-neutral-900/30 p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-neutral-400 tracking-wider mb-4">Missions Admin en attente</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">🏷️</span>
                            <div>
                              <p className="text-xs font-black uppercase tracking-tight text-white">Commissions en suspens</p>
                              <p className="text-[10px] text-neutral-500">Ventes en attente de validation</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md ${stats.pendingSalesCount > 0 ? 'bg-amber-500 text-black animate-pulse' : 'bg-neutral-800 text-neutral-500'}`}>
                            {stats.pendingSalesCount} à revoir
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">💸</span>
                            <div>
                              <p className="text-xs font-black uppercase tracking-tight text-white">Demandes de retraits</p>
                              <p className="text-[10px] text-neutral-500">Retraits Mobile Money demandés</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md ${stats.pendingPayoutsCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-neutral-800 text-neutral-500'}`}>
                            {stats.pendingPayoutsCount} demandes
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
                      💡 <strong>Astuce :</strong> Allez dans la partie <em>"Gestion Opérationnelle"</em> pour valider ces transactions afin d'actualiser les chiffres instantanément !
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VENTES & FINANCES */}
            {activeTab === 'sales' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-black uppercase text-amber-400 tracking-tight flex items-center gap-2">
                    <span>💰</span> Trésorerie & Volume d'Affiliation
                  </h3>
                  <p className="text-xs text-neutral-500">Visualisez les sommes générées par l'Académie et reversées à vos membres.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-black/30 border border-white/5 p-6 rounded-2xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-black">Volume total généré</p>
                    <p className="text-2xl font-black text-amber-400 font-mono mt-1">{formatMoney(stats.totalSalesVolume)}</p>
                    <p className="text-[9px] text-neutral-500 mt-1 uppercase tracking-wider">Ventes approuvées et payées</p>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-6 rounded-2xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-black">Reversé aux membres (Validé)</p>
                    <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{formatMoney(stats.totalPayoutsApproved)}</p>
                    <p className="text-[9px] text-neutral-500 mt-1 uppercase tracking-wider">Retraits d'argent réussis</p>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-6 rounded-2xl">
                    <p className="text-[10px] text-neutral-400 uppercase font-black">Paiements en attente</p>
                    <p className="text-2xl font-black text-rose-400 font-mono mt-1">{stats.pendingPayoutsCount} demandes</p>
                    <p className="text-[9px] text-neutral-500 mt-1 uppercase tracking-wider">En cours d'examen manuel</p>
                  </div>
                </div>

                {/* Recent Logs list */}
                <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-6">
                  <h4 className="text-xs font-bold uppercase text-neutral-400 tracking-wider mb-4">Fils d'activité récent (Ventes)</h4>
                  
                  {stats.recentLogs.length === 0 ? (
                    <p className="text-xs text-neutral-600 text-center py-6">Aucune vente enregistrée dans l'historique récent.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {stats.recentLogs.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="font-bold text-white uppercase">{log.userName}</span>
                            <span className="text-neutral-500">a enregistré une vente de</span>
                            <span className="font-black text-amber-400 font-mono">{formatMoney(log.amount)}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-neutral-500">{new Date(log.date).toLocaleDateString('fr-FR')}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              log.status === 'approved' || log.status === 'finalized' 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : log.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              {log.status === 'approved' || log.status === 'finalized' ? 'Approuvée' : log.status === 'pending' ? 'En suspens' : 'Rejetée'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ACTIVITES & PRESENCE */}
            {activeTab === 'activities' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-black uppercase text-sky-400 tracking-tight flex items-center gap-2">
                    <span>⏱️</span> Activité & Présence en Direct
                  </h3>
                  <p className="text-xs text-neutral-500">Suivez le nombre d'utilisateurs actifs, leur temps de présence aujourd'hui, hier et explorez n'importe quelle date.</p>
                </div>

                {/* Scorecards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Today Card */}
                  <div className="bg-gradient-to-br from-neutral-900 to-[#141414] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3.5 font-black text-[9px] text-sky-400 bg-sky-500/10 rounded-bl-2xl">AUJOURD'HUI</div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Membres actifs</p>
                    <p className="text-4xl font-black text-white font-mono mt-1">{stats.activeUsersTodayCount}</p>
                    
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Temps cumulé :</span>
                      <span className="font-mono font-black text-sky-400">{formatHours(stats.minutesTodayTotal)}</span>
                    </div>
                  </div>

                  {/* Yesterday Card */}
                  <div className="bg-gradient-to-br from-neutral-900 to-[#141414] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3.5 font-black text-[9px] text-neutral-400 bg-white/5 rounded-bl-2xl">HIER</div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Membres actifs</p>
                    <p className="text-4xl font-black text-neutral-300 font-mono mt-1">{stats.activeUsersYesterdayCount}</p>
                    
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Temps cumulé :</span>
                      <span className="font-mono font-black text-neutral-400">{formatHours(stats.minutesYesterdayTotal)}</span>
                    </div>
                  </div>

                  {/* Cumulated All-Time Card */}
                  <div className="bg-[#111111] border border-white/5 p-6 rounded-3xl relative overflow-hidden">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Cumul Historique Global</p>
                    <p className="text-2xl font-black text-emerald-400 font-mono mt-3 truncate">{formatHours(stats.totalMinutesSpent)}</p>
                    
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Heures de formation :</span>
                      <span className="font-mono font-black text-emerald-400">{(stats.totalMinutesSpent / 60).toFixed(0)}h</span>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE DATE EXPLORER (FILTRE + LISTE) */}
                <div className="bg-[#111111]/80 border border-white/5 rounded-[2rem] p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-pulse"></span>
                        🕵️ Explorateur d'activité quotidien
                      </h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Sélectionnez une date pour voir l'historique complet des présences des ambassadeurs.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setSelectedActivityDate(getLocalDateString(0))}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                          selectedActivityDate === getLocalDateString(0)
                            ? 'bg-sky-500 text-black shadow-lg scale-105 font-black' 
                            : 'bg-white/5 hover:bg-white/10 text-neutral-400 border border-white/5'
                        }`}
                      >
                        Aujourd'hui
                      </button>
                      <button
                        onClick={() => setSelectedActivityDate(getLocalDateString(-1))}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                          selectedActivityDate === getLocalDateString(-1)
                            ? 'bg-[#222] text-white shadow-lg scale-105 font-black border border-white/10' 
                            : 'bg-white/5 hover:bg-white/10 text-neutral-400 border border-white/5'
                        }`}
                      >
                        Hier
                      </button>
                      
                      <div className="relative flex items-center bg-[#070707] border border-white/10 rounded-xl px-3 py-2 gap-2 hover:border-sky-500/30 transition-all text-xs w-full sm:w-auto">
                        <span>📅</span>
                        <input 
                          type="date"
                          className="bg-transparent text-[10px] text-white font-black uppercase outline-none cursor-pointer w-full text-center"
                          value={selectedActivityDate}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSelectedActivityDate(e.target.value);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Render list of active users */}
                  {loadingDateDetails ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <RefreshCw className="animate-spin text-sky-400" size={24} />
                      <span className="text-xs text-neutral-500 uppercase font-black tracking-wider">Chargement de la présence...</span>
                    </div>
                  ) : activeUsersOnDate.length === 0 ? (
                    <div className="text-center py-12 text-xs text-neutral-500 bg-[#0c0c0c] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                      <span className="text-2xl">💤</span>
                      <p className="font-black uppercase tracking-wider text-neutral-450 mt-1">Aucune présence enregistrée</p>
                      <p className="text-[10px] text-neutral-600 max-w-sm mx-auto">Aucun membre n'a activé son onboarding pour le {new Date(selectedActivityDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[10px] text-neutral-400 uppercase font-black tracking-wider flex items-center gap-1.5 bg-[#090909] p-3 rounded-xl border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {activeUsersOnDate.length} ambassadeur(s) actif(s) détecté(s) le {new Date(selectedActivityDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      
                      <div className="grid grid-cols-1 gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {activeUsersOnDate.map((item, index) => {
                          const userMeta = stats.userRegistry[item.user_id] || { name: 'Ambassadeur Inconnu', email: 'Sans adresse email' };
                          return (
                            <div key={item.user_id || index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-black/40 hover:bg-black/50 rounded-2xl border border-white/5 gap-3 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500/10 to-indigo-500/10 text-sky-400 flex items-center justify-center text-xs font-black border border-sky-500/20">
                                  {userMeta.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-black uppercase text-white tracking-tight">{userMeta.name}</p>
                                  <p className="text-[10px] text-neutral-500 font-mono tracking-tight">{userMeta.email}</p>
                                </div>
                              </div>
                              
                              <div className="flex flex-row items-center justify-between sm:justify-end gap-6 w-full sm:w-auto text-xs border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                                <div className="text-left sm:text-right">
                                  <p className="text-[8px] text-neutral-500 uppercase font-black tracking-wider">Activité cumulée</p>
                                  <p className="font-mono font-black text-emerald-400 mt-0.5">{formatHours(item.total_minutes)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] text-neutral-500 uppercase font-black tracking-wider">Dernier passage</p>
                                  <p className="font-mono text-neutral-300 text-[10px] mt-0.5">{new Date(item.last_ping).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Helpful Reminder Banner */}
                <div className="rounded-2xl bg-sky-500/5 border border-sky-500/15 p-5 flex items-start gap-4">
                  <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl shrink-0">⚡</div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase text-white">Pourquoi suivre ce temps de présence ?</h4>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      L'Académie MZ+ rémunère et récompense l'activité et l'assiduité grâce au <em>Power Audit</em>. Chaque minute passée sur l'application aide l'ambassadeur à débloquer des points XP et à valider ses défis quotidiens pour réclamer des bonus financiers réels.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ENTONNOIR DES DEFIS */}
            {activeTab === 'challenges' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-black uppercase text-purple-400 tracking-tight flex items-center gap-2">
                    <span>🏅</span> Entonnoir de réussite (Défi 3 Jours)
                  </h3>
                  <p className="text-xs text-neutral-500">Le taux d'abandon et d'achèvement étape par étape du fameux onboarding intensif de 72h.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Step 1 */}
                  <div className="bg-[#111111] p-5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-sky-500/15 text-sky-400 rounded">Jour 1</span>
                      <span className="text-xs font-mono font-bold text-white">{stats.completedJ1} Membre(s)</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-neutral-200">Prise en main & Lien affiliation</p>
                      <p className="text-[10px] text-neutral-500">L'ambassadeur a copié son code unique et appris les règles de base.</p>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-[#111111] p-5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-amber-500/15 text-amber-500 rounded">Jour 2</span>
                      <span className="text-xs font-mono font-bold text-white">{stats.completedJ2} Membre(s)</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-neutral-200">Première publication virale</p>
                      <p className="text-[10px] text-neutral-500">Apprentissage de la production vidéo et de l'adaptation d'audience.</p>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-1000" 
                        style={{ width: `${stats.completedJ1 > 0 ? (stats.completedJ2 / stats.completedJ1) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-neutral-500 text-right uppercase">
                      Survie : {stats.completedJ1 > 0 ? Math.round((stats.completedJ2 / stats.completedJ1) * 100) : 0}% du Jour 1
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-[#111111] p-5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-1 bg-purple-500/15 text-purple-400 rounded">Jour 3</span>
                      <span className="text-xs font-mono font-bold text-white">{stats.completedJ3} Membre(s)</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-neutral-200">Félicitations & Retrait</p>
                      <p className="text-[10px] text-neutral-500">Conversion réussie et réclamation de la prime de bienvenue.</p>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-1000" 
                        style={{ width: `${stats.completedJ2 > 0 ? (stats.completedJ3 / stats.completedJ2) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-neutral-500 text-right uppercase">
                      Survie : {stats.completedJ2 > 0 ? Math.round((stats.completedJ3 / stats.completedJ2) * 100) : 0}% du Jour 2
                    </p>
                  </div>
                </div>

                <div className="bg-purple-500/5 border border-purple-500/15 p-5 rounded-2xl">
                  <p className="text-xs font-black uppercase text-purple-400 tracking-wider">🏆 Champions de Onboarding :</p>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Au total, <strong>{stats.completedJ3}</strong> ambassadeurs ont brillamment triomphé des 3 jours consécutifs d'exercice et ont reçu leur badge de certification. Un taux de conversion J1 ➔ J3 de <strong>{stats.completedJ1 > 0 ? ((stats.completedJ3 / stats.completedJ1) * 100).toFixed(1) : 0}%</strong> est à féliciter !
                  </p>
                </div>
              </div>
            )}

            {/* TAB 5: LES EXPLICATIONS CLAIRES */}
            {activeTab === 'help' && (
              <div className="space-y-6 animate-fade-in text-neutral-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-black uppercase text-white tracking-tight">
                    💡 Guide d'utilisation simple de l'Analyse
                  </h3>
                  <p className="text-xs text-neutral-500">Pour tout comprendre en un coup d'œil, sans jargon compliqué !</p>
                </div>

                <div className="space-y-4">
                  <p>
                    <strong>1. C'est quoi ce tableau ?</strong><br />
                    C'est votre centre de commande en direct. Chaque fois qu'un membre utilise son compte, fait une vente ou demande un transfert d'argent, ce tableau enregistre l'événement de manière 100% réelle.
                  </p>
                  <p>
                    <strong>2. Que faire si les données changent ?</strong><br />
                    Il suffit de cliquer sur le gros bouton vert <strong>"Actualiser"</strong> en haut à droite. Les chiffres vont instantanément interroger la base de données PostgreSQL pour recalculer les totaux globaux de l'Académie.
                  </p>
                  <p>
                    <strong>3. Les chiffres sont-ils simulés ?</strong><br />
                    Non ! Contrairement aux anciennes versions avec des graphiques factices, toutes les informations affichées ici proviennent de véritables requêtes directes à votre base de données Supabase.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
