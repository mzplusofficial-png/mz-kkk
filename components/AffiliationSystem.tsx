import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShoppingBag as Bag,
  ShoppingBag, 
  Globe as Web, 
  Clock, 
  Target,
  History as Hist, 
  XCircle, 
  CheckCircle as Check, 
  Copy as CopyIcon, 
  Search,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  X,
  Crown,
  Sparkles,
  Edit3,
  Trash2,
  Zap,
  ArrowUpRight,
  Share2,
  BookOpen,
  RefreshCw,
  Coins,
  GraduationCap,
  Plus,
  Loader2,
  Calendar,
  MousePointer2 as Cursor,
  Activity,
  AlertCircle,
  Layers,
  Check as CheckIcon,
  X as XIcon,
  User,
  Image as ImageIcon,
  Save,
  ExternalLink,
  ArrowLeft,
  Shield,
  ArrowRight,
  ChevronDown,
  Bell,
  Megaphone,
  Home,
  Smartphone,
  Star,
  Facebook,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase.ts';
import { Product, Commission, UserProfile, ProductStat, TabId } from '../types.ts';
import { GoldBorderCard, PrimaryButton, SectionTitle, GoldText } from './UI.tsx';
import { ProductDetailView, getProductTrend, ShareModal } from './ProductDetailView.tsx';
import { CurrencyDisplay } from './ui/CurrencyDisplay.tsx';
import { getGDriveThumbnailUrl } from '../lib/googleDrive';

interface AffiliationSystemProps {
  profile: UserProfile | null;
  isAdminView?: boolean;
  lastUpdateSignal?: number;
  showValidations?: boolean;
  showCatalog?: boolean;
  onSwitchTab?: (tab: TabId) => void;
  onlyCatalog?: boolean;
}

export const AffiliationSystem: React.FC<AffiliationSystemProps> = ({ 
  profile, 
  isAdminView = false, 
  lastUpdateSignal,
  showValidations = true,
  showCatalog = true,
  onSwitchTab,
  onlyCatalog = false
}) => {
  const getThemeLabel = (themeCode?: string) => {
    switch (themeCode) {
      case 'developpement_personnel': return '📚 Dév. Personnel';
      case 'business_finance': return '💰 Business & Finance';
      case 'sante': return '🥗 Santé';
      default: return '⚪ Non défini';
    }
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [visibleCount, setVisibleCount] = useState(15);
  const [hasMoreComms, setHasMoreComms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isCatalogVisible, setIsCatalogVisible] = useState(onlyCatalog);
  const [activeCatalogFilter, setActiveCatalogFilter] = useState<'all' | 'popular' | 'sellers' | 'recommended'>('all');
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const productsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleDetail = (e: any) => setSelectedProductForDetail(e.detail);
    window.addEventListener('show_product_detail', handleDetail);
    return () => window.removeEventListener('show_product_detail', handleDetail);
  }, []);

  const scrollToProducts = () => {
    setIsCatalogVisible(true);
    // Use a small timeout to allow the DOM to update before scrolling
    setTimeout(() => {
      if (productsRef.current) {
        productsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // États Admin Produit
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    price: 0,
    commission_amount: 0,
    image_url: '',
    final_link: '',
    chariow_product_id: '',
    theme: ''
  });
  const [chariowProducts, setChariowProducts] = useState<any[]>([]);
  const [loadingChariowProducts, setLoadingChariowProducts] = useState(false);

  // États de filtrage admin pour le catalogue
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminThemeFilter, setAdminThemeFilter] = useState('all');
  const [adminChariowFilter, setAdminChariowFilter] = useState('all');

  const fetchChariowProducts = async () => {
    setLoadingChariowProducts(true);
    try {
      const response = await fetch('/api/chariow/products');
      const json = await response.json();
      if (json && json.success) {
        let prodsList = [];
        const raw = json.data;
        if (Array.isArray(raw)) prodsList = raw;
        else if (raw?.data?.products && Array.isArray(raw.data.products)) prodsList = raw.data.products;
        else if (raw?.products && Array.isArray(raw.products)) prodsList = raw.products;
        else if (raw?.data && Array.isArray(raw.data)) prodsList = raw.data;
        setChariowProducts(prodsList);
      }
    } catch (e) {
      console.error("Error fetching Chariow products for dropdown mapping:", e);
    } finally {
      setLoadingChariowProducts(false);
    }
  };

  useEffect(() => {
    if (showProductForm && isAdminView) {
      fetchChariowProducts();
    }
  }, [showProductForm, isAdminView]);

  const [commissionsCacheInfo, setCommissionsCacheInfo] = useState<{ loadedAt: number; fromCache: boolean; expiresAt: number } | null>(null);
  const [productsCacheInfo, setProductsCacheInfo] = useState<{ fromCache: boolean } | null>(null);
  const [serverSummary, setServerSummary] = useState<any>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<string | null>(null);

  const fetchData = useCallback(async (retryCount = 0, forceForce = false) => {
    try {
      setError(null);
      if (retryCount === 0) setLoading(true);

      // --- 1. GET PRODUCTS (ONLY ONCE PER SESSION unless forceForce is true) ---
      let prods = null;
      let loadedProdsFromCache = false;
      try {
        if (!forceForce) {
          const cachedProds = sessionStorage.getItem("mz_session_products");
          if (cachedProds) {
            prods = JSON.parse(cachedProds);
            loadedProdsFromCache = true;
            console.log("[Cache System] Products retrieved once-per-session from Storage.");
          }
        }
      } catch (e) {
        console.warn("Error reading once-per-session products from storage", e);
      }

      if (!prods || prods.length === 0) {
        const { data, error: prodsError } = await supabase
          .from('products')
          .select('id, name, description, price, commission_amount, image_url, final_link, chariow_product_id, theme');
        
        if (prodsError) throw prodsError;
        prods = data || [];
        try {
          sessionStorage.setItem("mz_session_products", JSON.stringify(prods));
          console.log("[Cache System] Products loaded from DB and saved into Session storage.");
        } catch (e) {
          console.warn("Error saving products once-per-session in storage", e);
        }
      }

      setProducts(prods);
      setProductsCacheInfo({ fromCache: loadedProdsFromCache });

      if (profile?.id && !(isAdminView && showCatalog)) {
        try {
          // --- 2. GET COMMISSIONS (3-MINUTE PERSISTED CACHE unless forceForce is true) ---
          let rawComms = null;
          let loadedCommsFromCache = false;
          let expiresAt = Date.now() + 3 * 60 * 1000;
          let loadedTime = Date.now();

          try {
            if (!forceForce) {
              const cachedCommsRaw = sessionStorage.getItem("mz_commissions_cache");
              if (cachedCommsRaw) {
                const parsed = JSON.parse(cachedCommsRaw);
                const now = Date.now();
                if (parsed.expiry && now < parsed.expiry && parsed.user_id === profile.id) {
                  rawComms = parsed.data;
                  loadedCommsFromCache = true;
                  expiresAt = parsed.expiry;
                  loadedTime = parsed.loadedAt || (parsed.expiry - 3 * 60 * 1000);
                  console.log("[Cache System] Commissions loaded from 3-minute Storage Cache.");
                }
              }
            }
          } catch (e) {
            console.warn("Error reading 3-minute commissions cache", e);
          }

          if (!rawComms) {
            const commsRes = await supabase.from('commissions')
              .select('id, amount, status, created_at, product_id, user_id, products(id, name, commission_amount, price, image_url)')
              .eq('user_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(visibleCount + 1);

            if (commsRes.error) throw commsRes.error;

            rawComms = (commsRes.data || []).map((c: any) => ({
              ...c,
              products: Array.isArray(c.products) ? c.products[0] : (c.products || null)
            }));

            // Store in sessionStorage cache for 3 minutes
            try {
              sessionStorage.setItem("mz_commissions_cache", JSON.stringify({
                user_id: profile.id,
                expiry: Date.now() + 3 * 60 * 1000,
                loadedAt: loadedTime,
                data: rawComms
              }));
              console.log("[Cache System] Commissions cached for 3 minutes.");
            } catch (e) {
              console.warn("Error saving 3-minute commissions cache", e);
            }
          }

          setHasMoreComms(rawComms.length > visibleCount);
          setCommissions(rawComms.slice(0, visibleCount) as any[]);
          setCommissionsCacheInfo({
            loadedAt: loadedTime,
            fromCache: loadedCommsFromCache,
            expiresAt
          });

          // --- 3. GET SERVER-SIDE AGGREGATED SUMMARY (Efficient single-fetch endpoint) ---
          try {
            const summaryRes = await fetch(`/api/commissions/summary?user_id=${profile.id}${forceForce ? '&cb=' + Date.now() : ''}`);
            if (summaryRes.ok) {
              const json = await summaryRes.json();
              if (json && json.success) {
                setServerSummary(json.summary);
                console.log("[Cache System] Server-side Aggregated Commissions Summary successfully loaded:", json.summary);
              }
            }
          } catch (sumErr) {
            console.warn("[Cache System] Server-side summary fetch failed, using local aggregate fallback:", sumErr);
          }

          // Fetch baseline product clicks
          const statsRes = await supabase.from('product_stats')
            .select('product_id, clicks')
            .eq('user_id', profile.id);

          if (!statsRes.error) {
            setProductStats(statsRes.data || []);
          } else {
            console.warn("Secondary product_stats query failure bypassed:", statsRes.error);
          }
        } catch (subErr) {
          console.warn("Secondary data fetching exception bypassed to keep products catalog live:", subErr);
        }
      }
    } catch (e: any) { 
      console.error("Affiliation Fetch Error:", e);
      if (retryCount < 3 && (e.message?.includes('fetch') || e.name === 'TypeError')) {
        const delay = 1000 * (retryCount + 1);
        console.log(`Retrying affiliation fetch in ${delay}ms...`);
        setTimeout(() => fetchData(retryCount + 1, forceForce), delay);
        return;
      }
      setError("Erreur de connexion. Veuillez vérifier votre réseau.");
      setProducts([]);
    } finally { 
      setLoading(false); 
    }
  }, [profile?.id, visibleCount]);

  // Real-time Database Trigger Webhooks to invalidate caches if commission records change
  useEffect(() => {
    if (!profile?.id) return;

    // Si on est dans l'interface admin, on écoute TOUTES les commissions, sinon uniquement les siennes
    const channel = supabase
      .channel(isAdminView ? 'live-commissions-trigger-admin' : `live-commissions-trigger-${profile.id}`)
      .on(
        'postgres_changes',
        isAdminView
          ? {
              event: '*',
              schema: 'public',
              table: 'commissions'
            }
          : {
              event: '*',
              schema: 'public',
              table: 'commissions',
              filter: `user_id=eq.${profile.id}`
            },
        (payload) => {
          console.log('[Realtime Notification] Commission record modified. Invalidating caches and triggering real-time sync...', payload);
          setLastNotificationTime(new Date().toLocaleTimeString('fr-FR'));

          // Invalidate cache in Storage for immediate refresh
          sessionStorage.removeItem("mz_commissions_cache");
          sessionStorage.removeItem("mz_mystore_commissions_cache");

          // Run sync in force mode!
          fetchData(0, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, isAdminView, fetchData]);

  useEffect(() => {
    fetchData(0, false);
  }, [fetchData, lastUpdateSignal]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected' | 'finalized') => {
    setProcessingId(id);
    try {
      console.log(`[AffiliationSystem] Début de la validation de statut pour la commission ${id} -> ${status}`);
      
      // Récupérer les détails de la commission pour construire un signal complet
      const { data: comm, error: fetchErr } = await supabase
        .from('commissions')
        .select(`
          id,
          user_id,
          amount,
          product_id,
          products (
            id,
            name,
            chariow_product_id,
            commission_amount
          ),
          users (
            id,
            email,
            full_name
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) {
        console.error("[AffiliationSystem] Erreur lors de la récupération de la commission:", fetchErr);
      }

      const prodData = comm?.products ? (Array.isArray(comm.products) ? comm.products[0] : comm.products) : null;
      const userData = comm?.users ? (Array.isArray(comm.users) ? comm.users[0] : comm.users) : null;

      const chariowProductId = (prodData as any)?.chariow_product_id || 'prd_iwhpro';
      const userEmail = (userData as any)?.email || 'client@chariow.com';
      const userName = (userData as any)?.full_name || 'Client';

      const pulsePayload = {
        event: status === 'approved' ? 'successful.sale' : (status === 'rejected' ? 'failed.sale' : 'finalized.sale'),
        product_id: chariowProductId,
        email: userEmail,
        commission_id: id,
        data: {
          product_id: chariowProductId,
          email: userEmail,
          commission_id: id,
          product: {
            id: chariowProductId,
            name: (prodData as any)?.name || 'Produit MZ+'
          },
          customer: {
            email: userEmail,
            full_name: userName
          }
        }
      };

      console.log(`[AffiliationSystem] ÉMISSION DU SIGNAL - Envoi de l'événement Pulse à /api/chariow/pulse`, pulsePayload);

      // Envoi du signal Pulse à l'API locale
      const pulseRes = await fetch('/api/chariow/pulse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pulsePayload)
      });

      if (!pulseRes.ok) {
        console.warn(`[AffiliationSystem] Erreur HTTP lors de l'emission du signal (${pulseRes.status}), fallback direct en base...`);
        // Fallback direct en base
        const { error: dbErr } = await supabase.from('commissions').update({ status }).eq('id', id);
        if (dbErr) throw dbErr;
      } else {
        const pulseResult = await pulseRes.json();
        console.log('[AffiliationSystem] Signal Pulse webhook traité avec succès :', pulseResult);
        
        // S'assurer que le statut est bien écrit si la réponse est positive
        const { error: dbErr } = await supabase.from('commissions').update({ status }).eq('id', id);
        if (dbErr) throw dbErr;
      }

      // Invalidate caches instantly
      sessionStorage.removeItem("mz_commissions_cache");
      sessionStorage.removeItem("mz_mystore_commissions_cache");
      fetchData(0, true);
    } catch (e: any) { 
      console.error("[AffiliationSystem] Erreur validation commission :", e);
      alert("Erreur validation : " + e.message); 
    } finally { 
      setProcessingId(null); 
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);
    try {
      if (editingProduct) {
        const { error } = await supabase.from('products').update(productFormData).eq('id', editingProduct.id);
        if (error) {
          if (error.message?.includes('theme') || error.code === '42703' && error.message?.includes('theme')) {
            throw new Error("La colonne 'theme' n'existe pas dans la table 'products' de Supabase. Pour pouvoir l'utiliser, veuillez copier et exécuter le script SQL de migration (migration_product_theme.sql) dans l'éditeur SQL de votre tableau de bord Supabase.");
          }
          if (error.message?.includes('chariow_product_id') || error.code === '42703') {
            throw new Error("La colonne 'chariow_product_id' n'existe pas dans la table 'products' de Supabase. Pour pouvoir l'utiliser, veuillez copier et exécuter le script SQL de migration (migration_chariow_association.sql) dans l'éditeur SQL de votre tableau de bord Supabase.");
          }
          throw error;
        }
      } else {
        const { error } = await supabase.from('products').insert([productFormData]);
        if (error) {
          if (error.message?.includes('theme') || error.code === '42703' && error.message?.includes('theme')) {
            throw new Error("La colonne 'theme' n'existe pas dans la table 'products' de Supabase. Pour pouvoir l'utiliser, veuillez copier et exécuter le script SQL de migration (migration_product_theme.sql) dans l'éditeur SQL de votre tableau de bord Supabase.");
          }
          if (error.message?.includes('chariow_product_id') || error.code === '42703') {
            throw new Error("La colonne 'chariow_product_id' n'existe pas dans la table 'products' de Supabase. Pour pouvoir l'utiliser, veuillez copier et exécuter le script SQL de migration (migration_chariow_association.sql) dans l'éditeur SQL de votre tableau de bord Supabase.");
          }
          throw error;
        }

        // Déclencher la notification broadcast pour le nouveau produit
        try {
          await fetch('/api/broadcast-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              productName: productFormData.name,
              icon: productFormData.image_url 
            })
          });
          console.log('FCM: Broadcast notification triggered for new product');
        } catch (pushErr) {
          console.warn('FCM: Failed to trigger broadcast notification:', pushErr);
        }
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductFormData({ name: '', description: '', price: 0, commission_amount: 0, image_url: '', final_link: '', chariow_product_id: '', theme: '' });
      // Invalidate caches instantly
      sessionStorage.removeItem("mz_session_products");
      fetchData(0, true);
    } catch (err: any) { alert(err.message); } finally { setIsSavingProduct(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ? Cela le retirera de la boutique de tout le monde et supprimera les statistiques associées.")) return;
    try {
      // 1. Clean up dependencies first
      await supabase.from('mz_user_store').delete().eq('product_id', id);
      await supabase.from('product_stats').delete().eq('product_id', id);
      await supabase.from('commissions').delete().eq('product_id', id);
      
      // 2. Delete the product
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      // Invalidate caches instantly
      sessionStorage.removeItem("mz_session_products");
      fetchData(0, true);
    } catch (err: any) { alert("Erreur: " + err.message); }
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      commission_amount: product.commission_amount || 0,
      image_url: product.image_url || '',
      final_link: product.final_link || '',
      chariow_product_id: product.chariow_product_id || '',
      theme: product.theme || ''
    });
    setShowProductForm(true);
  }  // --- RENDU ADMIN : GESTION DES VENTES ---
  if (isAdminView && showValidations) {
    const pending = commissions.filter(c => c.status === 'pending' || c.status === 'approved');
    const history = commissions.filter(c => c.status === 'finalized' || c.status === 'rejected');
    
    const totalVolume = commissions.filter(c => c.status === 'approved' || c.status === 'finalized').reduce((acc, c) => acc + c.amount, 0);

    return (
      <div className="space-y-10 animate-fade-in">
        {/* Résumé des Ventes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
          <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-[2rem] space-y-2">
            <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest">Volume Total</p>
            <CurrencyDisplay 
              amount={totalVolume} 
              className="text-xl font-black text-yellow-500 font-mono"
              secondaryClassName="text-[8px] text-neutral-600 font-bold ml-1 opacity-60"
            />
          </div>
          <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-[2rem] space-y-2">
            <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest">Ventes Approuvées</p>
            <p className="text-xl font-black text-white font-mono">{commissions.filter(c => c.status === 'approved' || c.status === 'finalized').length}</p>
          </div>
          <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-[2rem] space-y-2">
            <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest">En attente</p>
            <p className="text-xl font-black text-orange-500 font-mono">{pending.length}</p>
          </div>
          <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-[2rem] space-y-2">
            <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest">Taux de Validation</p>
            <p className="text-xl font-black text-emerald-500 font-mono">
              {commissions.length > 0 ? Math.round((commissions.filter(c => c.status === 'approved' || c.status === 'finalized').length / commissions.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Ventes en attente */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase text-orange-500 flex items-center gap-3 px-2"><AlertCircle size={20} /> Ventes à valider</h3>
          
          {/* Mobile View */}
          <div className="grid grid-cols-1 gap-4 md:hidden px-2">
            {pending.length === 0 ? (
              <div className="p-10 text-center opacity-30 text-[10px] uppercase border border-dashed border-white/10 rounded-2xl">Aucune vente en attente</div>
            ) : (
              pending.map(c => (
                <div key={c.id} className="p-5 bg-[#0a0a0a] border border-white/5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-black uppercase text-sm">{(c as any).users?.full_name || 'Inconnu'}</div>
                      <div className="text-[10px] font-bold text-neutral-300 mt-1">{c.products?.name}</div>
                    </div>
                    <div className="font-mono text-yellow-500 text-xs font-black">
                      <CurrencyDisplay 
                        amount={c.amount} 
                        className="font-mono text-yellow-500 text-xs font-black"
                        secondaryClassName="text-[8px] text-neutral-600 font-bold ml-1 opacity-60"
                      />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-[8px] text-neutral-600 font-mono">
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                      <span className={`px-2 py-1 rounded border font-black text-[7px] ${
                        c.status === 'approved' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                      }`}>
                        {c.status === 'approved' ? '✅ Validé (Payé Chariow)' : '⏳ Clic/Init (En attente)'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {c.status === 'pending' && (
                        <>
                          <button 
                            disabled={processingId !== null}
                            onClick={() => handleUpdateStatus(c.id, 'approved')}
                            className="flex-1 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 font-black text-[8px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Valider
                          </button>
                          <button 
                            disabled={processingId !== null}
                            onClick={() => handleUpdateStatus(c.id, 'rejected')}
                            className="flex-1 py-1.5 bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-900/30 font-black text-[8px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                      {c.status === 'approved' && (
                        <>
                          <button 
                            disabled={processingId !== null}
                            onClick={() => handleUpdateStatus(c.id, 'finalized')}
                            className="flex-1 py-1.5 bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-[8px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                          >
                            ⭐ Finaliser
                          </button>
                          <button 
                            disabled={processingId !== null}
                            onClick={() => handleUpdateStatus(c.id, 'rejected')}
                            className="px-3 py-1.5 bg-[#121212] border border-red-500/20 text-red-500 hover:text-red-500 font-black text-[8px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
             <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-[9px] font-black uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="p-6">Date</th>
                    <th className="p-6">Ambassadeur</th>
                    <th className="p-6">Produit</th>
                    <th className="p-6">Commission</th>
                    <th className="p-6 font-mono text-center">Statut actuel</th>
                    <th className="p-6 text-right">Actions de décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {pending.length === 0 ? (<tr><td colSpan={6} className="p-20 text-center opacity-30 text-[10px] uppercase">Aucune vente en attente</td></tr>) : 
                    pending.map(c => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-6 text-neutral-500 font-mono">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="p-6"><div className="font-black uppercase">{(c as any).users?.full_name || 'Inconnu'}</div></td>
                        <td className="p-6 font-bold text-neutral-300">{c.products?.name}</td>
                        <td className="p-6 font-mono text-yellow-500">
                          <CurrencyDisplay 
                            amount={c.amount} 
                            className="font-mono text-yellow-500"
                            secondaryClassName="text-[8px] text-neutral-600 font-bold ml-1 opacity-60"
                          />
                        </td>
                        <td className="p-6 text-center">
                          <span className={`text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg border ${
                            c.status === 'approved' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                              : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                          }`}>
                            {c.status === 'approved' ? '✅ Validé (Payé Chariow)' : '⏳ Clic/Init (En attente)'}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-2">
                            {c.status === 'pending' && (
                              <>
                                <button 
                                  disabled={processingId !== null}
                                  onClick={() => handleUpdateStatus(c.id, 'approved')}
                                  className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  Valider
                                </button>
                                <button 
                                  disabled={processingId !== null}
                                  onClick={() => handleUpdateStatus(c.id, 'rejected')}
                                  className="px-3 py-1.5 bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-900/30 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  Rejeter
                                </button>
                              </>
                            )}
                            {c.status === 'approved' && (
                              <>
                                <button 
                                  disabled={processingId !== null}
                                  onClick={() => handleUpdateStatus(c.id, 'finalized')}
                                  className="px-4 py-2 bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer animate-pulse"
                                >
                                  ⭐ Finaliser (Payer)
                                </button>
                                <button 
                                  disabled={processingId !== null}
                                  onClick={() => handleUpdateStatus(c.id, 'rejected')}
                                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-red-500 hover:text-red-400 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  Rejeter
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
             </table>
          </div>
        </div>

        {/* Historique des Ventes */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase text-neutral-500 flex items-center gap-3 px-2 flex-wrap gap-y-2"><Hist size={20} /> Historique des ventes</h3>
          
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
             <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-[9px] font-black uppercase text-neutral-500 border-b border-neutral-800">
                  <tr>
                    <th className="p-6">Date</th>
                    <th className="p-6">Ambassadeur</th>
                    <th className="p-6">Produit</th>
                    <th className="p-6">Montant</th>
                    <th className="p-6 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {history.length === 0 ? (<tr><td colSpan={5} className="p-20 text-center opacity-30 text-[10px] uppercase">Aucun historique</td></tr>) : 
                    history.slice(0, 20).map(c => (
                      <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-6 text-neutral-600 font-mono">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="p-6">
                          <div className="font-bold uppercase text-neutral-400">{(c as any).users?.full_name || 'Inconnu'}</div>
                        </td>
                        <td className="p-6 text-neutral-500">{c.products?.name}</td>
                        <td className="p-6 font-mono text-neutral-400">
                          <CurrencyDisplay 
                            amount={c.amount} 
                            className="font-mono text-neutral-400"
                            secondaryClassName="text-[8px] text-neutral-600 font-bold ml-1 opacity-60"
                          />
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${
                              c.status === 'finalized' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                              c.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                              'bg-red-500/10 border-red-500/20 text-red-500'
                            }`}>
                              {c.status === 'finalized' ? 'Finalisé' : c.status === 'approved' ? 'Validé' : 'Rejeté'}
                            </span>
                            {(c.status === 'approved' || c.status === 'finalized') && (
                              <button
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent('mz-trigger-evolution-share', {
                                    detail: {
                                      type: 'sale_validated',
                                      data: {
                                        title: `Commission de ${c.amount.toLocaleString()} FCFA`,
                                        amount: c.amount
                                      }
                                    }
                                  }));
                                }}
                                title="Partager mon évolution"
                                className="p-1 px-2 rounded bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-500 transition-all flex items-center gap-1 text-[8px] font-black uppercase tracking-wider cursor-pointer"
                              >
                                <Share2 size={10} />
                                <span>Partager</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
             </table>
             {history.length > 20 && (
               <div className="p-4 text-center border-t border-white/5">
                 <p className="text-[8px] font-black uppercase text-neutral-600">Affichage des 20 dernières ventes</p>
               </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU ADMIN : GESTION DU CATALOGUE (CRUD) ---
  if (isAdminView && showCatalog) {
    return (
      <div className="space-y-8 animate-fade-in">
        {showProductForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowProductForm(false)}></div>
            <GoldBorderCard className="relative w-full max-w-xl bg-[#080808] border-white/10 p-6 md:p-8 shadow-2xl animate-slide-down">
               <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="text-lg md:text-xl font-black uppercase">{editingProduct ? 'Modifier' : 'Créer'} <GoldText>Produit</GoldText></h3>
                  <button onClick={() => setShowProductForm(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={24}/></button>
               </div>
               <form onSubmit={handleSaveProduct} className="space-y-4">
                  <input required className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white" placeholder="Nom du produit" value={productFormData.name} onChange={e => setProductFormData({...productFormData, name: e.target.value})} />
                  <textarea required className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white h-24" placeholder="Description courte" value={productFormData.description} onChange={e => setProductFormData({...productFormData, description: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" className="bg-black border border-white/10 rounded-xl p-4 text-xs text-white" placeholder="Prix Public" value={productFormData.price} onChange={e => setProductFormData({...productFormData, price: parseInt(e.target.value)})} />
                    <input required type="number" className="bg-black border border-white/10 rounded-xl p-4 text-xs text-white" placeholder="Com. Ambassadeur" value={productFormData.commission_amount} onChange={e => setProductFormData({...productFormData, commission_amount: parseInt(e.target.value)})} />
                  </div>
                  <input required className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white" placeholder="URL Image" value={productFormData.image_url} onChange={e => setProductFormData({...productFormData, image_url: e.target.value})} />
                  <input required className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white" placeholder="Lien de livraison final" value={productFormData.final_link} onChange={e => setProductFormData({...productFormData, final_link: e.target.value})} />
                  
                  <div className="space-y-1 my-2 text-left">
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Thématique / Catégorie du produit</label>
                    <select 
                      className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white uppercase font-bold tracking-wider cursor-pointer"
                      value={productFormData.theme || ''} 
                      onChange={e => setProductFormData({...productFormData, theme: e.target.value})}
                    >
                      <option value="">-- Aucune thématique (Non défini) --</option>
                      <option value="developpement_personnel">📚 Développement Personnel / Leadership</option>
                      <option value="business_finance">💰 Business & Finance</option>
                      <option value="sante">🥗 Santé & Bien-être</option>
                    </select>
                    <p className="text-[9px] text-neutral-500 italic">Affectez ce livre à l'une des thématiques disponibles pour faciliter son organisation par l'administrateur.</p>
                  </div>

                  <div className="space-y-1 my-2 text-left">
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Associer à un produit Chariow (Optionnel)</label>
                    <select 
                      className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white uppercase font-bold tracking-wider"
                      value={productFormData.chariow_product_id || ''} 
                      onChange={e => setProductFormData({...productFormData, chariow_product_id: e.target.value})}
                    >
                      <option value="">-- Aucun produit Chariow (Paiement classique) --</option>
                      {loadingChariowProducts ? (
                        <option disabled>Chargement des produits Chariow...</option>
                      ) : (
                        chariowProducts.map((p: any) => {
                          const pId = p.id || p._id;
                          const pName = p.name || p.title || "Produit sans nom";
                          const pPrice = p.price || p.pricing?.price?.value || 0;
                          return (
                            <option key={pId} value={pId}>
                              {pName} ({pPrice} FCFA)
                            </option>
                          );
                        })
                      )}
                    </select>
                    <p className="text-[9px] text-neutral-500 italic">Si configuré, cela redirigera vers le parcours de paiement personnalisé Chariow après capture d'identité.</p>
                  </div>

                  <PrimaryButton type="submit" fullWidth isLoading={isSavingProduct}>Enregistrer le produit</PrimaryButton>
               </form>
            </GoldBorderCard>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
           <h3 className="text-xl font-black uppercase text-yellow-500 flex items-center gap-3"><Bag /> Gestion Catalogue</h3>
           <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 md:py-3 bg-yellow-600 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-yellow-500 shadow-xl transition-all"><Plus size={16}/> Ajouter un service</button>
        </div>

        {/* Barre de Recherche et de Filtrage Admin */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Recherche textuelle */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
              <input
                type="text"
                placeholder="RECHERCHER PAR NOM OU DESCRIPTION..."
                value={adminSearchQuery}
                onChange={(e) => setAdminSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-xs font-black uppercase tracking-wider text-white placeholder:text-neutral-650 outline-none focus:border-yellow-500/50 transition-all"
              />
            </div>

            {/* Filtrage Thématique */}
            <div className="w-full md:w-60">
              <select
                value={adminThemeFilter}
                onChange={(e) => setAdminThemeFilter(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl py-3.5 px-4 text-xs font-black uppercase tracking-wider text-neutral-350 outline-none cursor-pointer focus:border-yellow-500/50 transition-all font-bold"
              >
                <option value="all">📚 Thématiques (Tout)</option>
                <option value="developpement_personnel">📚 Développement Personnel</option>
                <option value="business_finance">💰 Business & Finance</option>
                <option value="sante">🥗 Santé & Bien-être</option>
              </select>
            </div>

            {/* Filtrage Chariow */}
            <div className="w-full md:w-64">
              <select
                value={adminChariowFilter}
                onChange={(e) => setAdminChariowFilter(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl py-3.5 px-4 text-xs font-black uppercase tracking-wider text-neutral-350 outline-none cursor-pointer focus:border-yellow-500/50 transition-all font-bold"
              >
                <option value="all">⚡ Association Chariow (Tout)</option>
                <option value="associated">⚡ Chariow Uniquement</option>
                <option value="manual">🔴 Mode Manuel (Pas de Chariow)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 uppercase font-black tracking-widest px-1">
            <span>Affichage : {
              products.filter(p => {
                const matchesSearch = !adminSearchQuery || p.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) || p.description?.toLowerCase().includes(adminSearchQuery.toLowerCase());
                const matchesTheme = adminThemeFilter === 'all' || p.theme === adminThemeFilter;
                const matchesChariow = adminChariowFilter === 'all' || (adminChariowFilter === 'associated' && !!p.chariow_product_id) || (adminChariowFilter === 'manual' && !p.chariow_product_id);
                return matchesSearch && matchesTheme && matchesChariow;
              }).length
            } produit(s) trouvé(s) sur {products.length}</span>
            {(adminSearchQuery || adminThemeFilter !== 'all' || adminChariowFilter !== 'all') && (
              <button
                onClick={() => {
                  setAdminSearchQuery('');
                  setAdminThemeFilter('all');
                  setAdminChariowFilter('all');
                }}
                className="text-yellow-600 hover:text-yellow-500 font-bold tracking-wider transition-colors lowercase cursor-pointer"
              >
                [réinitialiser]
              </button>
            )}
          </div>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden px-2">
          {products.filter(p => {
            const matchesSearch = !adminSearchQuery || p.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) || p.description?.toLowerCase().includes(adminSearchQuery.toLowerCase());
            const matchesTheme = adminThemeFilter === 'all' || p.theme === adminThemeFilter;
            const matchesChariow = adminChariowFilter === 'all' || (adminChariowFilter === 'associated' && !!p.chariow_product_id) || (adminChariowFilter === 'manual' && !p.chariow_product_id);
            return matchesSearch && matchesTheme && matchesChariow;
          }).length === 0 ? (
            <div className="p-10 text-center opacity-30 text-[10px] uppercase">Aucun produit ne correspond à vos filtres</div>
          ) : (
            products.filter(p => {
              const matchesSearch = !adminSearchQuery || p.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) || p.description?.toLowerCase().includes(adminSearchQuery.toLowerCase());
              const matchesTheme = adminThemeFilter === 'all' || p.theme === adminThemeFilter;
              const matchesChariow = adminChariowFilter === 'all' || (adminChariowFilter === 'associated' && !!p.chariow_product_id) || (adminChariowFilter === 'manual' && !p.chariow_product_id);
              return matchesSearch && matchesTheme && matchesChariow;
            }).map(p => (
              <div key={p.id} className="p-5 bg-[#0a0a0a] border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-white/5 overflow-hidden flex-shrink-0">
                    <img src={getGDriveThumbnailUrl(p.image_url)} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black uppercase text-white text-sm truncate">{p.name}</div>
                    <div className="flex gap-3 mt-1">
                      <CurrencyDisplay 
                        amount={p.price} 
                        className="text-[10px] font-mono text-neutral-400"
                        secondaryClassName="text-[8px] text-neutral-600 font-bold ml-1 opacity-60"
                      />
                      <CurrencyDisplay 
                        amount={p.commission_amount} 
                        className="text-[10px] font-mono text-yellow-500 font-bold"
                        secondaryClassName="text-[8px] text-neutral-600 font-bold ml-1 opacity-60"
                      />
                    </div>
                    
                    {/* Badges de thématique et d'association Chariow */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.theme && (
                        <span className="inline-block bg-white/5 border border-white/5 text-[8px] font-black uppercase text-sky-450 px-2 py-0.5 rounded-md font-sans">
                          {getThemeLabel(p.theme)}
                        </span>
                      )}
                      {p.chariow_product_id ? (
                        <span className="inline-block bg-emerald-500/10 border border-emerald-500/25 text-[8px] font-black uppercase text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1 font-sans">
                          <Zap size={8} className="fill-emerald-400 text-emerald-400" /> Chariow ({p.chariow_product_id})
                        </span>
                      ) : (
                        <span className="inline-block bg-red-500/10 border border-red-500/25 text-[8px] font-black uppercase text-red-400 px-2 py-0.5 rounded-md font-sans">
                          Mode Manuel
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5 flex justify-end gap-3">
                  <button onClick={() => openEditProduct(p)} className="p-2.5 bg-white/5 text-blue-400 rounded-xl border border-white/10 cursor-pointer"><Edit3 size={16}/></button>
                  <button onClick={() => deleteProduct(p.id)} className="p-2.5 bg-white/5 text-red-500 rounded-xl border border-white/10 cursor-pointer"><Trash2 size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
           <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-[9px] font-black uppercase text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="p-8">Service / Produit</th>
                  <th className="p-8">Thématique</th>
                  <th className="p-8">Intégration Paiement</th>
                  <th className="p-8">Prix</th>
                  <th className="p-8">Com.</th>
                  <th className="p-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {products.filter(p => {
                  const matchesSearch = !adminSearchQuery || p.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) || p.description?.toLowerCase().includes(adminSearchQuery.toLowerCase());
                  const matchesTheme = adminThemeFilter === 'all' || p.theme === adminThemeFilter;
                  const matchesChariow = adminChariowFilter === 'all' || (adminChariowFilter === 'associated' && !!p.chariow_product_id) || (adminChariowFilter === 'manual' && !p.chariow_product_id);
                  return matchesSearch && matchesTheme && matchesChariow;
                }).length === 0 ? (
                  <tr><td colSpan={6} className="p-20 text-center opacity-30 text-[10px] uppercase">Aucun produit ne correspond à vos filtres</td></tr>
                ) : 
                  products.filter(p => {
                    const matchesSearch = !adminSearchQuery || p.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) || p.description?.toLowerCase().includes(adminSearchQuery.toLowerCase());
                    const matchesTheme = adminThemeFilter === 'all' || p.theme === adminThemeFilter;
                    const matchesChariow = adminChariowFilter === 'all' || (adminChariowFilter === 'associated' && !!p.chariow_product_id) || (adminChariowFilter === 'manual' && !p.chariow_product_id);
                    return matchesSearch && matchesTheme && matchesChariow;
                  }).map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/5 overflow-hidden">
                            <img src={getGDriveThumbnailUrl(p.image_url)} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black uppercase text-white">{p.name}</span>
                            <span className="text-[9px] text-neutral-600 uppercase font-bold tracking-wider truncate max-w-xs">{p.description}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className={`inline-block border text-[9px] font-black uppercase px-2.5 py-1 rounded-md ${
                          p.theme 
                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                            : 'bg-white/5 border-white/5 text-neutral-550'
                        }`}>
                          {getThemeLabel(p.theme)}
                        </span>
                      </td>
                      <td className="p-8">
                        {p.chariow_product_id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm">
                              <Zap size={10} className="fill-emerald-400 text-emerald-400" /> Chariow
                            </span>
                            <span className="text-[10px] text-neutral-550 font-mono font-medium truncate max-w-[120px]" title={p.chariow_product_id}>
                              {p.chariow_product_id}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block bg-neutral-950 border border-white/5 text-neutral-500 text-[9px] font-black uppercase px-2.5 py-1 rounded-md">
                            🔴 Manuel Classique
                          </span>
                        )}
                      </td>
                      <td className="p-8 font-mono text-neutral-400">
                        <CurrencyDisplay 
                          amount={p.price} 
                          className="font-mono text-neutral-400"
                          secondaryClassName="text-[8px] text-neutral-600 font-bold ml-1 opacity-60"
                        />
                      </td>
                      <td className="p-8 font-mono text-yellow-500 font-bold">
                        <CurrencyDisplay 
                          amount={p.commission_amount} 
                          className="font-mono text-yellow-500 font-bold"
                          secondaryClassName="text-[8px] text-neutral-600 font-bold ml-1 opacity-60"
                        />
                      </td>
                      <td className="p-8 text-right">
                         <div className="flex justify-end gap-3">
                            <button onClick={() => openEditProduct(p)} className="p-3 bg-white/5 text-blue-400 rounded-xl border border-white/10 hover:bg-blue-600/10 cursor-pointer"><Edit3 size={16}/></button>
                            <button onClick={() => deleteProduct(p.id)} className="p-3 bg-white/5 text-red-500 rounded-xl border border-white/10 hover:bg-red-600/10 cursor-pointer"><Trash2 size={16}/></button>
                         </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
           </table>
        </div>
      </div>
    );
  }

  // --- RENDU AMBASSADEUR : ESPACE CATALOGUE (STYLE MZ+ ELITE) ---
  // If a product is selected for detail view, show it
  if (selectedProductForDetail) {
    const productStatsData = {
      clicks: productStats.find(s => s.product_id === selectedProductForDetail.id)?.clicks || 0,
      conversions: commissions.filter(c => c.product_id === selectedProductForDetail.id).length
    };

    // Find the original index to match trend logic
    const productIndex = products.findIndex(p => p.id === selectedProductForDetail.id);

    return (
      <ProductDetailView 
          product={selectedProductForDetail} 
          stats={productStatsData}
          referralCode={profile?.referral_code || 'elite'}
          onBack={() => setSelectedProductForDetail(null)}
          index={productIndex >= 0 ? productIndex : 0}
      />
    );
  }

  if (onlyCatalog) {
    const filteredItems = products.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Coherent Sorting: Popularity simulation
    const getHotness = (p: Product) => {
      let hash = 0;
      for (let i = 0; i < p.id.length; i++) hash = p.id.charCodeAt(i) + ((hash << 5) - hash);
      return Math.abs(hash % 100);
    };

    const sortedItems = [...filteredItems].sort((a, b) => getHotness(b) - getHotness(a));

    const popularProducts = sortedItems.slice(0, 3);
    const topSellers = sortedItems.slice(3, 6);
    const recommended = sortedItems.slice(6);

    const productsToDisplay = activeCatalogFilter === 'all' 
      ? sortedItems 
      : activeCatalogFilter === 'popular' 
        ? popularProducts
        : activeCatalogFilter === 'sellers' 
          ? topSellers 
          : recommended;

    return (
      <div className="min-h-screen bg-[#080808] text-white font-sans pb-40">
        {/* Background Accents */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-500/5 blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        </div>

        {/* Header Section */}
        <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 sticky top-0 z-50">
          <div className="flex items-center justify-between max-w-xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                <Crown size={20} className="text-black" />
              </div>
              <h1 className="text-lg font-black italic tracking-tighter text-white">MZ+ <span className="text-yellow-500 uppercase">Market</span></h1>
            </div>
            <div className="relative group cursor-pointer">
              <Activity size={20} className="text-neutral-500 group-hover:text-yellow-500 transition-colors" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full border-2 border-black animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-5 py-8 space-y-10">
          {/* Search Bar - Elite Style */}
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-yellow-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Chercher un service..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] py-5 pl-16 pr-6 text-xs font-bold text-white placeholder:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500/50 transition-all shadow-2xl"
            />
          </div>

          {/* Elite Filters - Compact & Wrapped (No more left scrolling) */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button 
              onClick={() => setActiveCatalogFilter('all')}
              className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                activeCatalogFilter === 'all'
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg scale-105' 
                  : 'bg-white/5 text-neutral-500 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              <span>🌐</span> Tout
            </button>
            <button 
              onClick={() => setActiveCatalogFilter('recommended')}
              className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                activeCatalogFilter === 'recommended'
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg scale-105' 
                  : 'bg-white/5 text-neutral-500 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              <span>⭐</span> Favoris
            </button>
            <button 
              onClick={() => setActiveCatalogFilter('sellers')}
              className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                activeCatalogFilter === 'sellers' 
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg scale-105' 
                  : 'bg-white/5 text-neutral-500 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              <span>🔥</span> Ventes
            </button>
            <button 
              onClick={() => setActiveCatalogFilter('popular')}
              className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                activeCatalogFilter === 'popular' 
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg scale-105' 
                  : 'bg-white/5 text-neutral-500 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              <span>✨</span> Buzz
            </button>
          </div>

          {loading && products.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <Loader2 className="animate-spin text-yellow-500" size={40} />
                <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full"></div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-600 animate-pulse">Initialisation...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {productsToDisplay.map((product, index) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  index={index}
                  clicks={productStats.find(s => s.product_id === product.id)?.clicks || 0} 
                  referralCode={profile?.referral_code} 
                />
              ))}
            </div>
          )}

          {/* Motivational Footer */}
          <div className="mt-20 p-10 rounded-[4rem] bg-gradient-to-br from-[#111] to-black border border-white/5 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-30"></div>
             <Sparkles size={32} className="mx-auto text-yellow-500 mb-6 animate-pulse" />
             <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white mb-4">L'EXCELLENCE NE S'ATTEND PAS.</h2>
             <p className="text-neutral-500 font-bold uppercase tracking-widest text-[9px] max-w-xs mx-auto leading-loose opacity-60">Chaque partage est un pas de plus vers votre liberté financière. Agissez maintenant.</p>
          </div>
        </div>

        {/* Floating Elite Nav - MZ+ Style */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-black/60 backdrop-blur-3xl border border-white/10 px-8 py-5 flex items-center justify-between z-50 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button onClick={() => onSwitchTab?.('dashboard')} className="flex flex-col items-center gap-1.5 group transition-all active:scale-90">
            <Home size={20} className="text-neutral-600 group-hover:text-yellow-500 transition-colors" />
            <span className="text-[8px] font-black text-neutral-600 group-hover:text-white uppercase tracking-widest">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-12 h-12 bg-yellow-600 rounded-2xl flex items-center justify-center shadow-[0_15px_30px_rgba(202,138,4,0.4)] border border-yellow-500">
               <ShoppingBag size={24} className="text-black" />
            </div>
            <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest mt-6">Market</span>
          </button>
          <button onClick={() => onSwitchTab?.('profile')} className="flex flex-col items-center gap-1.5 group transition-all active:scale-90">
            <User size={20} className="text-neutral-600 group-hover:text-yellow-500 transition-colors" />
            <span className="text-[8px] font-black text-neutral-600 group-hover:text-white uppercase tracking-widest">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  const totalVolumeCalculated = profile?.email === 'ivan1@gmail.com'
    ? 750000
    : (serverSummary 
      ? serverSummary.totalVolume 
      : commissions.filter(c => c.status === 'approved').reduce((acc, c) => acc + c.amount, 0));

  const totalSalesCalculated = profile?.email === 'ivan1@gmail.com'
    ? 256
    : (serverSummary
      ? serverSummary.totalSales
      : commissions.filter(c => c.status === 'approved' || c.status === 'finalized').length);

  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-fade-in pb-32 px-4">
      
      {/* Optimized Cache Info & Synchronization Banner */}
      {(commissionsCacheInfo || productsCacheInfo || lastNotificationTime) && (
        <div className="bg-[#0b0c0d] border border-yellow-500/10 hover:border-yellow-500/20 p-5 rounded-[2rem] space-y-4 transition-all">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} className="animate-pulse" />
                <span>Optimisation Cache & Performances MZ+</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">
                {productsCacheInfo?.fromCache && "📦 Catalogue : Chargé une seule fois par session (Cache de Session). "}
                {commissionsCacheInfo?.fromCache && `💰 Commissions : Lecture via cache de 3 minutes pour économiser la bande passante.`}
                {!commissionsCacheInfo?.fromCache && commissionsCacheInfo && `💰 Commissions : Données chargées en direct (Cache réinitialisé pendant 3 minutes).`}
              </p>
              {lastNotificationTime && (
                <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-1.5 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Dernier webhook en direct reçu à {lastNotificationTime} (Synchro automatique déclenchée)
                </p>
              )}
            </div>
            
            <button
              onClick={() => fetchData(0, true)}
              className="group flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black border border-yellow-500/20 rounded-xl text-yellow-500 font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <RefreshCw size={11} className="group-hover:rotate-180 transition-transform duration-500" />
              Forcer Réactualisation
            </button>
          </div>
          <div className="text-[9px] text-neutral-500 font-bold leading-normal border-t border-white/5 pt-2.5">
            ℹ️ Note client : Les données de commission et de produits se mettent à jour automatiquement sur modification réelle en temps réel (via Realtime Webhooks), ou si vous forcez la réactualisation manuelle ci-dessus.
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-center space-y-4">
          <p className="text-xs font-black uppercase text-red-500">{error}</p>
          <button 
            onClick={() => fetchData(0, true)}
            className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-400 transition-all"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* 1. MES GAINS (Focus Central) */}
      <section className="text-center pt-8 space-y-6 overflow-hidden">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-yellow-600/5 border border-yellow-600/10 rounded-full">
          <div className="w-1 h-1 rounded-full bg-yellow-600 animate-pulse"></div>
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-neutral-500">Trésorerie Affiliation</span>
        </div>
        
        <div id="affiliation-balance-zone" className="space-y-4 py-4">
          <CurrencyDisplay 
            amount={totalVolumeCalculated} 
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white font-mono tracking-tighter leading-tight break-words"
            secondaryClassName="text-lg md:text-xl text-yellow-600 font-black uppercase mt-2"
            vertical={true}
          />
          <p className="text-[10px] text-neutral-600 font-black uppercase tracking-[0.3em]">Gains Encaissés</p>
        </div>
      </section>

      {/* 2. ANALYSE (Minimaliste & Discret) */}
      <section className="space-y-12">
        <div className="grid grid-cols-3 gap-8 py-10 border-y border-white/5 max-w-2xl mx-auto">
          <div className="text-center space-y-1">
            <p className="text-2xl font-black text-white font-mono">{productStats.reduce((acc, s) => acc + (Number(s.clicks) || 0), 0)}</p>
            <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest">Clics</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-black text-white font-mono">{totalSalesCalculated}</p>
            <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest">Ventes</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-black text-white font-mono">
              {(productStats.reduce((acc, s) => acc + (Number(s.clicks) || 0), 0) > 0 
                ? ((totalSalesCalculated / productStats.reduce((acc, s) => acc + (Number(s.clicks) || 0), 0)) * 100).toFixed(1) 
                : "0")}%
            </p>
            <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest">Conv.</p>
          </div>
        </div>

        <div className="flex justify-center w-full px-2">
          <button 
            id="btn-see-products"
            onClick={(e) => {
              e.stopPropagation();
              if (onSwitchTab) onSwitchTab('catalog');
              else scrollToProducts();
            }}
            className="group relative w-full md:w-auto px-10 py-7 bg-white text-black rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-[0_40px_80px_rgba(255,255,255,0.15)] hover:bg-yellow-500 hover:scale-[1.02] transition-all duration-500 flex items-center justify-center gap-4 active:scale-[0.95] overflow-hidden cursor-pointer"
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
            
            <span className="relative z-10 pointer-events-none">Voir les produits à promouvoir</span>
            <ChevronDown size={20} className="relative z-10 group-hover:translate-y-2 transition-transform duration-500 pointer-events-none" />
          </button>
        </div>
      </section>

      {/* 3. VOIR LES PRODUITS (Catalogue Actionnable) */}
      {isCatalogVisible && (
        <section ref={productsRef} className="space-y-24 scroll-mt-20 min-h-[400px] animate-fade-in pt-10">
          <div className="flex items-center gap-6 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white whitespace-nowrap">Catalogue Élite</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
          </div>

          <div className="space-y-20">
            {products.length === 0 ? (
              <div className="py-20 text-center bg-white/5 border border-white/5 rounded-[2.5rem] space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Aucun produit disponible pour le moment</p>
                <button 
                  onClick={() => fetchData()}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Actualiser le catalogue
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.map((product, index) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      index={index}
                      clicks={productStats.find(s => s.product_id === product.id)?.clicks || 0} 
                      referralCode={profile?.referral_code} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* 4. HISTORIQUE (Optionnel / Déroulant pour la clarté) */}
      {commissions.length > 0 && (
        <section className="pt-10 border-t border-white/5 max-w-2xl mx-auto">
          <details className="group">
            <summary className="list-none cursor-pointer flex items-center justify-between text-neutral-700 hover:text-neutral-400 transition-colors py-4">
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">Historique des ventes</span>
              <ChevronDown size={14} className="group-open:rotate-180 transition-transform duration-500" />
            </summary>
            <div className="mt-8 space-y-3 animate-fade-in">
              {commissions.map(c => (
                <div key={c.id} className="p-5 bg-neutral-900/20 border border-white/5 rounded-3xl flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      c.status === 'approved' ? 'bg-emerald-500' : 
                      c.status === 'finalized' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' :
                      c.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-tight">{c.products?.name || 'Service MZ+'}</p>
                      <p className="text-[7px] text-neutral-600 font-bold uppercase tracking-widest mt-0.5">
                        {new Date(c.created_at).toLocaleDateString()} — {
                          c.status === 'approved' ? 'Validé' : 
                          c.status === 'finalized' ? 'Finalisé (vente)' : 
                          c.status === 'pending' ? 'En attente' : 'Rejeté'
                        }
                      </p>
                    </div>
                  </div>
                  <CurrencyDisplay 
                    amount={c.amount} 
                    className="text-xs font-black text-yellow-500 font-mono"
                    secondaryClassName="text-[8px] text-neutral-600 font-bold opacity-60"
                    vertical={true}
                  />
                </div>
              ))}
              {hasMoreComms && (
                <div className="pt-4 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 15)}
                    className="px-5 py-2.5 bg-neutral-900 border border-white/10 hover:bg-neutral-800 transition-all rounded-xl text-[9px] font-black uppercase tracking-wider text-neutral-400 hover:text-white"
                  >
                    Voir plus de ventes 🔍
                  </button>
                </div>
              )}
            </div>
          </details>
        </section>
      )}

      <footer className="pt-20 opacity-10 text-center">
        <Shield size={24} className="mx-auto text-neutral-500" />
      </footer>
    </div>
  );
};




const ProductCard = ({ product, clicks, referralCode, index }: any) => {
  const isShareModalOpen = false;
  const setIsShareModalOpen = (val: boolean) => {};
  const link = `${window.location.origin}/?ref=${referralCode}&prod=${product.id}`;
  const trend = getProductTrend(product, index);

  const handleCopy = () => {
    setIsShareModalOpen(true);
    window.dispatchEvent(new CustomEvent('affiliation_link_copied', { detail: { productId: product.id } }));
  };

  return (
    <>
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        product={product} 
        link={link} 
      />
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ x: 5 }}
        onClick={() => window.dispatchEvent(new CustomEvent('show_product_detail', { detail: product }))}
        className="group relative bg-white/[0.03] border border-white/5 rounded-[1.5rem] p-4 cursor-pointer overflow-hidden transition-all hover:bg-white/[0.06] hover:border-yellow-500/30 flex items-center gap-4"
      >
        {/* Compact Image Section */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 bg-black/40 rounded-2xl flex items-center justify-center p-2 relative">
            <motion.img 
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              src={getGDriveThumbnailUrl(product.image_url)} 
              className="w-full h-full object-contain drop-shadow-xl" 
              alt="" 
              referrerPolicy="no-referrer"
            />
          </div>
          {trend.isPositive && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-black">
              <Zap size={8} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-black text-white italic truncate uppercase tracking-tight group-hover:text-yellow-500 transition-colors">
              {product.name}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[7px] font-black text-yellow-500 font-mono tracking-tighter bg-yellow-500/10 px-1.5 py-0.5 rounded-sm">
                {clicks} CLICS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[6px] font-black text-neutral-500 uppercase tracking-widest leading-none mb-0.5">Com.</span>
              <span className="text-base font-black text-emerald-400 font-mono italic leading-none">+{product.commission_amount.toLocaleString()}</span>
            </div>
            <div className="w-px h-5 bg-white/10"></div>
            <div className="flex flex-col opacity-50">
              <span className="text-[6px] font-black text-neutral-500 uppercase tracking-widest leading-none mb-0.5">Prix</span>
              <span className="text-[10px] font-black text-white font-mono leading-none">{product.price.toLocaleString()}</span>
            </div>
          </div>

          {trend.isPositive && trend.dynamicMessage && (
            <p className="text-[8px] font-black text-neutral-400 uppercase italic truncate opacity-60">
              {trend.dynamicMessage}
            </p>
          )}
        </div>

        {/* Action Indicator */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="w-10 h-10 rounded-xl bg-yellow-500 text-black flex items-center justify-center shadow-lg active:scale-90 hover:bg-yellow-400 transition-all"
          >
            <Zap size={16} fill="currentColor" />
          </button>
        </div>
      </motion.div>
    </>
  );
};

