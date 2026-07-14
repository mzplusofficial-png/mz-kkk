
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Zap, 
  Target, 
  Award, 
  Star, 
  Lock, 
  ChevronRight, 
  Flame,
  CheckCircle2,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Smartphone,
  LayoutDashboard,
  Loader2
} from 'lucide-react';
import { Product } from '../types.ts';
import { CurrencyDisplay } from './ui/CurrencyDisplay.tsx';
import { supabase } from '../services/supabase.ts';
import { countriesSorted, getFlagEmoji, detectDefaultCountryCode } from './countries.ts';
import { useCurrency } from '../hooks/useCurrency.ts';
import { getGDriveThumbnailUrl } from '../lib/googleDrive';

interface ProductSalesPageProps {
  product: Product;
  onPurchase: () => void;
  purchaseStep: 'view' | 'processing' | 'success';
  countdown: number;
  isLoggedIn?: boolean;
}

export const ProductSalesPage: React.FC<ProductSalesPageProps> = ({ 
  product, 
  onPurchase, 
  purchaseStep, 
  countdown,
  isLoggedIn = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShowingChariowForm, setIsShowingChariowForm] = useState(false);
  const [customerData, setCustomerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: 'CI'
  });
  const [isSubmittingChariow, setIsSubmittingChariow] = useState(false);
  const [errorMessageChariow, setErrorMessageChariow] = useState<string | null>(null);

  const { currency } = useCurrency();
  
  useEffect(() => {
    // 100% Client-side local variables & JWT parse if logged in, avoiding any database network/lookup queries
    const loadClientProfileDetails = async () => {
      try {
        if (isLoggedIn) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const user = session.user;
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
            const parts = fullName.split(' ');
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';
            
            const profileMock = {
              country_code: user.user_metadata?.country_code || null,
              country: user.user_metadata?.country || null
            };
            
            const detectedCode = detectDefaultCountryCode(currency, profileMock);
            
            setCustomerData(prev => ({
              ...prev,
              firstName: prev.firstName || firstName,
              lastName: prev.lastName || lastName,
              email: prev.email || user.email || '',
              phone: prev.phone || user.phone || user.user_metadata?.phone || '',
              countryCode: detectedCode
            }));
            return;
          }
        }
        
        // Non-logged in fallback
        if (currency) {
          const detectedCode = detectDefaultCountryCode(currency, null);
          setCustomerData(prev => ({
            ...prev,
            countryCode: detectedCode
          }));
        }
      } catch (err) {
        console.warn("[ProductSalesPage] Client-side session load error:", err);
        if (currency) {
          const detectedCode = detectDefaultCountryCode(currency, null);
          setCustomerData(prev => ({ ...prev, countryCode: detectedCode }));
        }
      }
    };

    loadClientProfileDetails();
  }, [isLoggedIn, currency]);

  const handleChariowCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingChariow(true);
    setErrorMessageChariow(null);

    const urlParams = new URLSearchParams(window.location.search);
    const referrerCode = urlParams.get('ref') || '';
    const redirectUrl = `${window.location.origin}/?merci=true&sale={sale_id}&prod=${product.id}${referrerCode ? `&ref=${referrerCode}` : ''}`;

    // Nettoyage intelligent du numéro de téléphone
    let cleanPhone = customerData.phone.replace(/\D/g, '');
    
    // Correspondance pour supprimer le préfixe téléphonique s'il est déjà saisi dans le champ
    const dialCodes: { [key: string]: string } = {};
    countriesSorted.forEach(c => {
      dialCodes[c.code] = c.dial;
    });
    
    const dialCode = dialCodes[customerData.countryCode];
    if (dialCode && cleanPhone.startsWith(dialCode) && cleanPhone.length > dialCode.length) {
      cleanPhone = cleanPhone.substring(dialCode.length);
    }

    try {
      const response = await fetch('/api/chariow/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: product.chariow_product_id,
          email: customerData.email,
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          phone: {
            number: cleanPhone,
            country_code: customerData.countryCode
          },
          redirect_url: redirectUrl
        })
      });

      const json = await response.json();
      if (json.success) {
        const checkoutUrl = 
          json.data?.payment?.checkout_url || 
          json.data?.data?.payment?.checkout_url || 
          json.data?.checkout_url || 
          json.checkout_url;

        // --- ENREGISTRER LA COMMISSION EN ATTENTE (PENDING) ---
        if (referrerCode) {
          try {
            const { data: referrer } = await supabase
              .from('users')
              .select('id')
              .eq('referral_code', referrerCode)
              .maybeSingle();

            if (referrer) {
              console.log("[Chariow Checkout] Initialisation d'une nouvelle commission en attente pour le parrain:", referrer.id);
              const { error: commError } = await supabase.from('commissions').insert([{
                user_id: referrer.id,
                product_id: product.id,
                amount: product.commission_amount,
                status: 'pending'
              }]);
              
              if (commError) {
                console.error("[Chariow Checkout] Erreur lors de l'enregistrement de la commission pending:", commError);
              } else {
                console.log("[Chariow Checkout] Commission pending enregistrée avec succès pour l'ambassadeur:", referrer.id);
              }
            }
          } catch (err) {
            console.error("[Chariow Checkout] Erreur lors de la création de la commission pending:", err);
          }
        }
        // --------------------------------------------------------

        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else if (product.price === 0 || !checkoutUrl) {
          // Si le produit est gratuit ou s'il n'y a pas besoin de lien de paiement (vente déjà validée / gratuite sur Chariow)
          console.log("[Chariow Checkout] Vente validée instantanément. Chargement de l'accès...");
          onPurchase();
        } else {
          setErrorMessageChariow("Impossible de récupérer le lien de paiement Chariow depuis l'API.");
        }
      } else {
        const detailError = json.message || 
                            json.error || 
                            json.data?.message || 
                            json.data?.error || 
                            json.data?.description || 
                            (typeof json.data === 'string' ? json.data : null) || 
                            "Erreur de l'API Chariow lors de l'initialisation du paiement.";
        setErrorMessageChariow(detailError);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessageChariow("Une erreur réseau ou serveur s'est produite lors du paiement.");
    } finally {
      setIsSubmittingChariow(false);
    }
  };
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  // Seuil pour afficher le bouton "Voir plus"
  const shouldShowToggle = product.description.length > 200;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-500 selection:text-black font-sans overflow-x-hidden">
      {/* Barre d'urgence supérieure */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 py-2 text-center sticky top-0 z-[100]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <Flame size={12} className="animate-pulse" /> 
          Offre exclusive : {minutes}m {seconds}s restantes 
          <Flame size={12} className="animate-pulse" />
        </p>
      </div>

      {/* Bouton de retour pour Ambassadeurs connectés */}
      {isLoggedIn && (
        <div className="absolute top-16 left-6 z-[110] animate-fade-in">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('close-product-details'))}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <LayoutDashboard size={14} className="text-yellow-500" />
            Retour au Dashboard
          </button>
        </div>
      )}

      {/* Hero Section - Format 9:16 visuel */}
      <section className="relative h-[90vh] flex flex-col justify-end p-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            src={getGDriveThumbnailUrl(product.image_url)} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">
            Édition Limitée
          </div>
          <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-tighter">
            {product.name}
          </h1>
          <div className="flex items-center gap-2 text-yellow-500">
            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
            <span className="text-white/60 text-[10px] font-bold ml-1 uppercase">4.9/5 par nos clients</span>
          </div>
          <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={(e) => {
                  if (product.chariow_product_id) {
                    setIsShowingChariowForm(true);
                    const el = document.getElementById('checkout-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    onPurchase();
                  }
                }}
                disabled={purchaseStep === 'processing' || isSubmittingChariow}
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingChariow ? (
                  <><Loader2 size={18} className="animate-spin" /> Traitement Chariow...</>
                ) : purchaseStep === 'processing' ? (
                  <><Loader2 size={18} className="animate-spin" /> Traitement...</>
                ) : (
                  <>Obtenir maintenant <ChevronRight size={18} /></>
                )}
              </button>
             <p className="text-center text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center justify-center gap-2">
                <ArrowDown size={12} /> Découvrir les détails
             </p>
          </div>
        </motion.div>
      </section>

      {/* Détails du produit */}
      <main className="p-6 space-y-12 pb-32">
        <div className="animate-fade-in">
          <div className="space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-yellow-500 flex items-center gap-3">
               <div className="w-8 h-px bg-yellow-500"></div> À propos du produit
            </h2>
            
            <div className="relative flex flex-col items-center lg:items-start">
              {/* Container de texte avec transition de hauteur */}
              <div 
                className={`text-lg text-neutral-300 font-medium leading-relaxed whitespace-pre-wrap transition-all duration-700 ease-in-out overflow-hidden relative ${
                  !isExpanded && shouldShowToggle ? 'max-h-[250px]' : 'max-h-[9999px]'
                }`}
              >
                {product.description}
                
                {/* Overlay de dégradé */}
                {!isExpanded && shouldShowToggle && (
                  <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none z-10"></div>
                )}
              </div>
              
              {/* Bouton Toggle */}
              {shouldShowToggle && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 text-black font-black uppercase text-[11px] tracking-[0.15em] hover:bg-yellow-400 transition-all active:scale-95 rounded-xl shadow-xl z-20 relative"
                >
                  {isExpanded ? (
                    <><ChevronUp size={16} /> Réduire la description</>
                  ) : (
                    <><ChevronDown size={16} /> Voir la description complète</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grille des bénéfices fixes */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { i: Zap, t: "Instant", d: "Accès immédiat" },
            { i: Target, t: "Précis", d: "Haute performance" },
            { i: ShieldCheck, t: "Sécurisé", d: "Protection totale" },
            { i: Award, t: "Qualité", d: "Premium" }
          ].map((feat, i) => (
            <div key={i} className="p-5 bg-neutral-900/30 border border-white/5 rounded-2xl flex flex-col items-center text-center gap-2">
              <feat.i size={20} className="text-yellow-500" />
              <div>
                <p className="text-[10px] font-black uppercase text-white">{feat.t}</p>
                <p className="text-[9px] text-neutral-500 font-bold uppercase">{feat.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Card */}
        <div className="mt-8" id="checkout-card">
          <div className="bg-gradient-to-br from-neutral-900 to-black p-8 md:p-12 rounded-[2.5rem] border border-yellow-500/20 shadow-2xl relative overflow-hidden">
            {purchaseStep === 'view' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] text-neutral-500 font-black uppercase mb-1">Prix de lancement</p>
                    <div className="flex items-baseline justify-center sm:justify-start whitespace-nowrap">
                      <CurrencyDisplay 
                        amount={product.price} 
                        className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tighter"
                        secondaryClassName="text-sm sm:text-lg text-yellow-500 font-black ml-2"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center sm:items-end gap-1">
                    <CurrencyDisplay 
                      amount={product.price * 1.5} 
                      className="text-sm text-neutral-600 line-through font-bold"
                      secondaryClassName="text-[8px] text-neutral-700 font-bold ml-1 opacity-40"
                    />
                    <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-lg animate-pulse">
                      -33% RÉDUCTION
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {product.chariow_product_id && isShowingChariowForm ? (
                    <form className="space-y-4 text-left p-6 md:p-8 bg-black/40 border border-white/5 rounded-3xl" onSubmit={handleChariowCheckoutSubmit}>
                      <h4 className="text-xs font-black uppercase text-yellow-500 tracking-wider">Informations de Facturation (Chariow)</h4>
                      <p className="text-[10px] text-neutral-400">Pour finaliser votre commande via Chariow, renseignez vos informations réelles de livraison afin de valider et d'importer l'accès de votre service ou ebook.</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Prénom</label>
                          <input 
                            required
                            type="text" 
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:border-yellow-500 transition-colors"
                            placeholder="Ex: Jean"
                            value={customerData.firstName}
                            onChange={e => setCustomerData({...customerData, firstName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Nom</label>
                          <input 
                            required
                            type="text" 
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:border-yellow-500 transition-colors"
                            placeholder="Ex: Kouassi"
                            value={customerData.lastName}
                            onChange={e => setCustomerData({...customerData, lastName: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Adresse Email</label>
                        <input 
                          required
                          type="email" 
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:border-yellow-500 transition-colors"
                          placeholder="client@domaine.com"
                          value={customerData.email}
                          onChange={e => setCustomerData({...customerData, email: e.target.value})}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Numéro de Téléphone</label>
                        <div className="flex gap-2">
                          <select 
                             className="bg-black/85 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-yellow-500 transition-colors max-w-[140px]"
                             value={customerData.countryCode}
                             onChange={e => setCustomerData({...customerData, countryCode: e.target.value})}
                          >
                             {countriesSorted.map(c => (
                               <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
                                 {getFlagEmoji(c.code)} {c.name} (+{c.dial}) ({c.code})
                               </option>
                             ))}
                          </select>
                          <input 
                            required
                            type="tel" 
                            className="flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:border-yellow-500 transition-colors"
                            placeholder="Numéro de mobile"
                            value={customerData.phone}
                            onChange={e => setCustomerData({...customerData, phone: e.target.value})}
                          />
                        </div>
                      </div>

                      {errorMessageChariow && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] uppercase font-bold text-center">
                          {errorMessageChariow}
                        </div>
                      )}

                      <div className="pt-2 flex flex-col gap-2">
                        <button 
                          type="submit"
                          disabled={isSubmittingChariow}
                          className="w-full bg-yellow-500 text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(234,179,8,0.2)] hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSubmittingChariow ? (
                            <><Loader2 size={16} className="animate-spin" /> Lien de paiement...</>
                          ) : (
                            <>Déclencher le paiement <ChevronRight size={16} /></>
                          )}
                        </button>
                        
                        <button 
                           type="button"
                           onClick={() => setIsShowingChariowForm(false)}
                           className="w-full bg-white/5 hover:bg-white/10 text-neutral-400 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all"
                        >
                           Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button 
                      onClick={() => {
                        if (product.chariow_product_id) {
                          setIsShowingChariowForm(true);
                        } else {
                          onPurchase();
                        }
                      }}
                      className="w-full bg-yellow-500 text-black py-6 rounded-2xl font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(234,179,8,0.3)] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                    >
                      Confirmer ma commande
                    </button>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                        <Lock size={12} className="text-yellow-500" /> Transaction chiffrée SSL
                      </div>
                    </div>

                    {/* Logos de Paiement (Visa, Mastercard, MoMo, PayPal) */}
                    <div className="pt-2 border-t border-white/5 flex flex-col items-center gap-4">
                      <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest">Méthodes de paiement acceptées</p>
                      <div className="flex items-center justify-center gap-4 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                        {/* Mobile Money Placeholder */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-black shadow-lg">
                            <Smartphone size={16} />
                          </div>
                          <span className="text-[6px] font-black uppercase text-neutral-500">MoMo</span>
                        </div>
                        {/* Visa Placeholder */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-6 bg-blue-700 rounded flex items-center justify-center text-white font-black italic text-[8px]">
                            VISA
                          </div>
                        </div>
                        {/* Mastercard Placeholder */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-6 flex items-center justify-center relative">
                             <div className="w-5 h-5 bg-red-600 rounded-full absolute left-1"></div>
                             <div className="w-5 h-5 bg-orange-500 rounded-full absolute right-1 mix-blend-screen"></div>
                          </div>
                        </div>
                        {/* PayPal Placeholder */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-6 bg-white/10 border border-white/10 rounded flex items-center justify-center text-[#003087] font-black text-[7px] italic">
                            PayPal
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {purchaseStep === 'processing' && (
              <div className="py-12 text-center space-y-6">
                <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-black uppercase tracking-widest animate-pulse">Initialisation du tunnel de paiement...</p>
                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Vérification de la passerelle sécurisée</p>
              </div>
            )}

            {purchaseStep === 'success' && (
              <div className="py-12 text-center space-y-6 animate-fade-in max-w-md mx-auto">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto border-2 border-green-500">
                  <CheckCircle2 size={40} className="animate-pulse" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-yellow-500">Merci pour votre commande !</h3>
                  <div className="h-px bg-white/10 w-24 mx-auto"></div>
                  <p className="text-sm font-bold text-white uppercase tracking-wider">
                    Votre transaction a été traitée avec succès.
                  </p>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Chariow se charge de vous expédier votre produit ainsi que vos accès directement par <span className="text-white font-bold">e-mail</span> dans les plus brefs délais. 
                  </p>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl text-left space-y-2">
                    <p className="text-[10px] text-yellow-500 uppercase font-black tracking-widest text-center">👁️ Action requise</p>
                    <p className="text-[11px] text-neutral-300 text-center">
                      Veuillez vérifier votre boîte de réception ainsi que votre dossier de <span className="text-white font-bold">courriers indésirables (spams)</span> ou promotions.
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      if (isLoggedIn) {
                        window.dispatchEvent(new CustomEvent('close-product-details'));
                      } else {
                        window.location.href = '/';
                      }
                    }}
                    className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-neutral-200 active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.05)]"
                  >
                    {isLoggedIn ? "Aller au Dashboard MZ+" : "Retourner à l'Accueil"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Minimaliste */}
      <footer className="p-10 border-t border-white/5 bg-black/50 text-center space-y-6">
        <div className="flex justify-center gap-6 opacity-40">
           <div className="w-8 h-5 bg-white/20 rounded"></div>
           <div className="w-8 h-5 bg-white/20 rounded"></div>
           <div className="w-8 h-5 bg-white/20 rounded"></div>
        </div>
        <p className="text-[9px] text-neutral-600 font-black uppercase tracking-[0.2em]">
          Service Client 24/7 • Paiement Sécurisé • Confidentialité Garantie
        </p>
      </footer>
    </div>
  );
};
