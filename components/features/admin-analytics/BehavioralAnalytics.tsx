import React, { useState, useEffect, useMemo } from 'react';
import { MousePointer2, Layers, Compass, RefreshCw, Flame, Globe } from 'lucide-react';
import { supabase } from '../../../services/supabase.ts';

export const BehavioralAnalytics = () => {
  const [trackingData, setTrackingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch offer page tracking data
      const { data: offerData, error } = await supabase
        .from('mz_offer_page_tracking')
        .select('*')
        .order('last_ping', { ascending: false });

      if (error) throw error;
      
      let finalData = offerData || [];
      
      // Fallback to active sessions from time tracking if empty
      if (finalData.length === 0) {
        const { data: activeRewards } = await supabase
          .from('mz_rewards_time_tracking')
          .select('*')
          .order('last_ping', { ascending: false })
          .limit(100);
          
        if (activeRewards && activeRewards.length > 0) {
          finalData = activeRewards.map(r => ({
            id: r.id,
            duration_seconds: (r.total_minutes || 1) * 60,
            started_at: r.created_at || r.last_ping || new Date().toISOString(),
            last_ping: r.last_ping || new Date().toISOString(),
          }));
        }
      }
      
      setTrackingData(finalData);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Behavioral analytics fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalVisits = trackingData.length;
    const avgDurationSeconds = totalVisits > 0 
      ? trackingData.reduce((acc, t) => acc + (t.duration_seconds || 0), 0) / totalVisits
      : 0;
    const hotLeads = trackingData.filter(t => (t.duration_seconds || 0) >= 120).length;
    
    const minutes = Math.floor(avgDurationSeconds / 60);
    const seconds = Math.round(avgDurationSeconds % 60);
    const avgStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    return {
      totalVisits,
      avgStr,
      hotLeads,
      retentionRate: totalVisits > 0 ? Math.round((hotLeads / totalVisits) * 100) : 0
    };
  }, [trackingData]);

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex flex-col gap-2">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
               <MousePointer2 className="text-emerald-400" />
               Analyse Comportementale
            </h2>
            <p className="text-neutral-400 text-xs">Comprenez comment vos utilisateurs naviguent et interagissent avec l'écosystème MZ+.</p>
         </div>
         
         <button 
           onClick={fetchData} 
           className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 text-black hover:bg-emerald-400 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all duration-300 transform active:scale-95 shadow-lg shadow-emerald-500/10 shrink-0 self-start"
         >
           <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
           {loading ? 'Mise à jour...' : 'Actualiser'}
         </button>
      </div>

      <div className="text-right text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
         Dernière synchro : <span className="font-mono text-emerald-400">{lastRefresh.toLocaleTimeString()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <AnalyticsCard title="Pages les plus consultées" value="Acquisition" trend="+12%" icon={Layers} />
         <AnalyticsCard title="Temps moyen / session" value={stats.avgStr} trend="+4%" icon={Compass} />
         <AnalyticsCard title="Prospects Engagés" value={`${stats.hotLeads}`} trend="+15%" icon={Flame} />
         <AnalyticsCard title="Volume d'activité" value={`${stats.totalVisits} sessions`} trend="+18%" icon={MousePointer2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase mb-4">Répartition de l'Engagement</h3>
              <div className="relative h-4 bg-white/5 rounded-full overflow-hidden flex">
                 <div 
                   className="h-full bg-emerald-500 transition-all duration-1000" 
                   style={{ width: `${stats.totalVisits > 0 ? ((stats.totalVisits - stats.hotLeads) / stats.totalVisits) * 100 : 100}%` }}
                 />
                 <div 
                   className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_20px_rgba(249,115,22,0.3)]" 
                   style={{ width: `${stats.totalVisits > 0 ? (stats.hotLeads / stats.totalVisits) * 100 : 0}%` }}
                 />
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-neutral-500 mt-4">
                 <span>Passifs : {stats.totalVisits - stats.hotLeads} ({stats.totalVisits > 0 ? 100 - stats.retentionRate : 100}%)</span>
                 <span>Engagés : {stats.hotLeads} ({stats.retentionRate}%)</span>
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 mt-4 leading-relaxed text-center italic">Les utilisateurs engagés restent plus de 2 minutes par session d'activité.</p>
         </div>

         <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase mb-4">Taux de Rétention Relatif</h3>
              <div className="text-center py-4">
                <p className="text-4xl font-mono font-black text-emerald-400">{stats.retentionRate}%</p>
                <p className="text-[9px] text-neutral-600 font-bold uppercase mt-1">Stabilité d'abandon modérée</p>
              </div>
            </div>
            <div className="flex justify-between text-[10px] uppercase font-bold text-neutral-500 mt-4 pt-4 border-t border-white/5">
               <span>Onboarding (100%)</span>
               <span>Activité ({stats.retentionRate}%)</span>
               <span>Upgrade (Optionnel)</span>
            </div>
         </div>
      </div>
    </div>
  );
};

const AnalyticsCard = ({ title, value, trend, icon: Icon }: any) => {
  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 flex items-center justify-between gap-4">
      <div className="space-y-2">
         <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{title}</p>
         <p className="text-xl font-black text-white uppercase tracking-tight font-mono">{value}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-2xl text-emerald-400">
         <Icon size={20} />
      </div>
    </div>
  );
};
