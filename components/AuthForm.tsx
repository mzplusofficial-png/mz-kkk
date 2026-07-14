
import React, { useState, useEffect } from 'react';
import { User, Mail, Key, Hash, AlertTriangle, Loader2, WifiOff, RefreshCw, LogIn, CheckCircle, HelpCircle, Globe, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabase.ts';
import { GoldBorderCard, InputField, PrimaryButton, SelectField } from './UI.tsx';
import { useCurrency } from '../hooks/useCurrency.ts';

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'Afrique du Sud': 'ZAR',
  'Algérie': 'DZD',
  'Angola': 'AOA',
  'Bénin': 'XOF',
  'Botswana': 'BWP',
  'Burkina Faso': 'XOF',
  'Burundi': 'BIF',
  'Cabo Verde': 'CVE',
  'Cameroun': 'XAF',
  'Centrafrique': 'XAF',
  'Comores': 'KMF',
  'Congo-Brazzaville': 'XAF',
  'Côte d\'Ivoire': 'XOF',
  'Djibouti': 'DJF',
  'Égypte': 'EGP',
  'Érythrée': 'ERN',
  'Eswatini': 'SZL',
  'Éthiopie': 'ETB',
  'Gabon': 'XAF',
  'Gambie': 'GMD',
  'Ghana': 'GHS',
  'Guinée (Conakry)': 'GNF',
  'Guinée Équatoriale': 'XAF',
  'Guinée-Bissau': 'XOF',
  'Kenya': 'KES',
  'Lesotho': 'LSL',
  'Libéria': 'LRD',
  'Libye': 'LYD',
  'Madagascar': 'MGA',
  'Malawi': 'MWK',
  'Mali': 'XOF',
  'Maroc': 'MAD',
  'Maurice': 'MUR',
  'Mauritanie': 'MRU',
  'Mozambique': 'MZN',
  'Namibie': 'NAD',
  'Niger': 'XOF',
  'Nigéria': 'NGN',
  'Ouganda': 'UGX',
  'RD Congo': 'CDF',
  'Rwanda': 'RWF',
  'Sénégal': 'XOF',
  'Seychelles': 'SCR',
  'Sierra Leone': 'SLE',
  'Somalie': 'SOS',
  'Soudan': 'SDG',
  'Soudan du Sud': 'SSP',
  'Tanzanie': 'TZS',
  'Tchad': 'XAF',
  'Togo': 'XOF',
  'Tunisie': 'TND',
  'Zambie': 'ZMW',
  'Zimbabwe': 'ZWL',
  // Europe / Autres
  'France': 'EUR',
  'Belgique': 'EUR',
  'Suisse': 'EUR',
  'Canada': 'USD',
  'États-Unis': 'USD',
  'Autre': 'XAF'
};

const COUNTRY_OPTIONS = Object.keys(COUNTRY_CURRENCY_MAP).map(country => ({
  value: country,
  label: country
}));

const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg 
    className="text-[#25D366] fill-current shrink-0 inline-block" 
    style={{ width: size, height: size }} 
    viewBox="0 0 24 24"
  >
    <path d="M12.003 21.003c-1.63 0-3.136-.453-4.42-1.238l-4.417 1.154 1.178-4.298c-.85-1.344-1.344-2.929-1.344-4.62 0-4.962 4.037-9 9-9 4.962 0 9 4.038 9 9s-4.038 9-9 9zm0-16.5c-4.136 0-7.5 3.364-7.5 7.5 0 1.545.474 2.978 1.282 4.17l-.768 2.802 2.868-.748c1.144.7 2.484 1.109 3.916 1.109 4.137 0 7.5-3.363 7.5-7.5s-3.363-7.5-7.5-7.5zm4.846 10.985c-.2-.1-.1.15-1.185-.385-.2-.1-.35-.15-.5.05s-.6.75-.75.9-.3.15-.5.05c-.2-.1-.85-.315-1.62-.999-.6-.535-1-1.195-1.115-1.395-.12-.2-.015-.31.085-.41.09-.09.2-.23.3-.35.1-.115.135-.2.2-.335.065-.135.035-.25-.015-.35s-.5-1.2-.685-1.65c-.185-.45-.37-.385-.5-.39s-.285-.01-.435-.01-.4.055-.6.275c-.2.22-.765.75-.765 1.83s.785 2.12 1 2.4c.2.275 1.535 2.345 3.72 3.29.52.225.925.36 1.24.46.52.165 1 .14 1.375.085.42-.06 1.285-.525 1.465-1.01.18-.48.18-.89.125-1.01-.055-.12-.2-.22-.4-.32z"/>
  </svg>
);

const WHATSAPP_COUNTRY_CODES = [
  { code: '+225', country: "Côte d'Ivoire", label: "🇨🇮 Côte d'Ivoire (+225)", currency: 'XOF' },
  { code: '+237', country: "Cameroun", label: "🇨🇲 Cameroun (+237)", currency: 'XAF' },
  { code: '+221', country: "Sénégal", label: "🇸🇳 Sénégal (+221)", currency: 'XOF' },
  { code: '+229', country: "Bénin", label: "🇧🇯 Bénin (+229)", currency: 'XOF' },
  { code: '+226', country: "Burkina Faso", label: "🇧🇫 Burkina Faso (+226)", currency: 'XOF' },
  { code: '+228', country: "Togo", label: "🇹🇬 Togo (+228)", currency: 'XOF' },
  { code: '+227', country: "Niger", label: "🇳🇪 Niger (+227)", currency: 'XOF' },
  { code: '+223', country: "Mali", label: "🇲🇱 Mali (+223)", currency: 'XOF' },
  { code: '+241', country: "Gabon", label: "🇬🇦 Gabon (+241)", currency: 'XAF' },
  { code: '+242', country: "Congo-Brazzaville", label: "🇨🇬 Congo (+242)", currency: 'XAF' },
  { code: '+235', country: "Tchad", label: "🇹🇩 Tchad (+235)", currency: 'XAF' },
  { code: '+243', country: "RD Congo", label: "🇨🇩 RD Congo (+243)", currency: 'CDF' },
  { code: '+236', country: "Centrafrique", label: "🇨🇫 Centrafrique (+236)", currency: 'XAF' },
  { code: '+212', country: "Maroc", label: "🇲🇦 Maroc (+212)", currency: 'MAD' },
  { code: '+216', country: "Tunisie", label: "🇹🇳 Tunisie (+216)", currency: 'TND' },
  { code: '+213', country: "Algérie", label: "🇩🇿 Algérie (+213)", currency: 'DZD' },
  { code: '+222', country: "Mauritanie", label: "🇲🇷 Mauritanie (+222)", currency: 'MRU' },
  { code: '+224', country: "Guinée (Conakry)", label: "🇬🇳 Guinée (+224)", currency: 'GNF' },
  { code: '+33',  country: "France", label: "🇫🇷 France (+33)", currency: 'EUR' },
  { code: '+32',  country: "Belgique", label: "🇧🇪 Belgique (+32)", currency: 'EUR' },
  { code: '+41',  country: "Suisse", label: "🇨🇭 Suisse (+41)", currency: 'EUR' },
  { code: '+1',   country: "Canada", label: "🇨🇦 Canada (+1)", currency: 'USD' },
];

interface AuthFormProps {
  defaultMode?: 'login' | 'signup';
}

export const AuthForm: React.FC<AuthFormProps> = ({ defaultMode = 'signup' }) => {
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState("Côte d'Ivoire");
  const [selectedDialCode, setSelectedDialCode] = useState('+225');
  const [localPhone, setLocalPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  
  const { updateCurrency } = useCurrency();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && !isLogin) {
      setReferralCode(ref);
    }
  }, [isLogin]);

  const handleDialCodeChange = (dialCode: string) => {
    setSelectedDialCode(dialCode);
    const found = WHATSAPP_COUNTRY_CODES.find(item => item.code === dialCode);
    if (found) {
      setCountry(found.country);
      const currency = COUNTRY_CURRENCY_MAP[found.country] || found.currency;
      if (currency) {
        updateCurrency(currency);
      }
    }
  };

  useEffect(() => {
    if (selectedDialCode && localPhone) {
      let cleanLocal = localPhone.replace(/\D/g, '');
      if (cleanLocal.startsWith('0')) {
        cleanLocal = cleanLocal.substring(1);
      }
      setPhone(`${selectedDialCode}${cleanLocal}`);
    } else {
      setPhone('');
    }
  }, [selectedDialCode, localPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsUserRegistered(false);
    setNeedsConfirmation(false);
    
    // Normalisation rigoureuse
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (!isLogin && cleanPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (!isLogin && (!localPhone || !phone)) {
      setError("Veuillez saisir votre numéro WhatsApp.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        console.log(`[AuthForm CLIENT] ======================= LOGIN FLOW =======================`);
        console.log(`[AuthForm CLIENT] [STEP 1/3] Calling server-side precheck and migration for: ${cleanEmail}`);
        
        const precheckResponse = await fetch('/api/auth/login-precheck-and-migrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword
          })
        });

        const precheckResult = await precheckResponse.json();
        console.log(`[AuthForm CLIENT] [STEP 2/3] Precheck response:`, precheckResult);

        if (!precheckResponse.ok) {
          throw new Error(precheckResult.error || "Email ou mot de passe incorrect.");
        }

        console.log(`[AuthForm CLIENT] [STEP 3/3] Precheck/migration succeeded. Executing client-side GoTrue sign-in...`);
        
        const signInResult = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: cleanPassword
        });
        
        console.log(`[AuthForm CLIENT] Raw Supabase Auth sign-in response received:`, signInResult);
        
        const { data: signInData, error: signInError } = signInResult;

        if (signInError) {
          console.error(`[AuthForm CLIENT] Supabase Auth sign-in error details:`, {
            message: signInError.message,
            status: signInError.status,
            name: signInError.name,
            code: (signInError as any).code || 'N/A'
          });

          const msg = signInError.message.toLowerCase();
          
          if (msg.includes('egress_quota') || msg.includes('restricted') || msg.includes('payment_required')) {
            throw new Error("Le service de base de données Supabase a restreint l'accès à ce projet en raison d'un dépassement de quota (exceed_egress_quota). Le propriétaire du projet (millionaireobject@gmail.com) doit se connecter sur supabase.com pour ajuster ses limites de dépenses (spend caps) ou mettre à jour son abonnement.");
          }
          
          // Gérer spécifiquement les erreurs de credentials vs confirmation
          if (msg.includes('email not confirmed')) {
            setNeedsConfirmation(true);
            throw new Error(`Votre email n'est pas encore confirmé. Détails erreur Supabase: ${signInError.message}`);
          }
          if (msg.includes('invalid login credentials') || msg.includes('double check')) {
            throw new Error("Email ou mot de passe incorrect.");
          }
          throw new Error(signInError.message);
        }

        console.log(`[AuthForm CLIENT] Login SUCCESS. Session active for user:`, signInData.user?.email);
        console.log(`[AuthForm CLIENT] ==========================================================`);
      } else {
        if (!name.trim()) {
          setError("Le nom complet est requis.");
          setLoading(false);
          return;
        }

        console.log(`[AuthForm CLIENT] ======================= REGISTRATION FLOW =======================`);
        console.log(`[AuthForm CLIENT] [STEP 1/3] Triggering server-side CSV link and registration for: ${cleanEmail}`, {
          name: name.trim(),
          country,
          referralCode: referralCode.trim() || 'N/A'
        });

        // Call server-side registry proxy to bypass email rate-limits and link imported users seamlessly
        const registryResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            name: name.trim(),
            country: country,
            phone: phone, // Pass the formatted WhatsApp phone number!
            referralCode: referralCode.trim() || null
          })
        });

        const registryResult = await registryResponse.json();
        console.log(`[AuthForm CLIENT] [STEP 2/3] Proxy API response status: ${registryResponse.status}`, registryResult);

        if (!registryResponse.ok) {
          throw new Error(registryResult.error || "Une erreur est survenue lors de l'inscription.");
        }

        console.log(`[AuthForm CLIENT] [STEP 3/3] Registration succeeded. Executing immediate auto-login...`);
        // Successfully registered! Let's sign them in immediately now that credentials exist & are confirmed
        const signInResult = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: cleanPassword
        });

        console.log(`[AuthForm CLIENT] Auto-login result:`, signInResult);
        const { error: signInError } = signInResult;

        if (signInError) {
          console.error("[AuthForm CLIENT] Auto sign-in failed after proxy registration. Raw error details:", signInError);
          setMessage("Votre compte a été créé avec succès ! Veuillez vous connecter avec vos accès.");
          setIsLogin(true);
        } else {
          console.log("[AuthForm CLIENT] Auto sign-in was fully successful!");
          setMessage("Félicitations ! Votre compte a été créé et vous êtes maintenant connecté.");
        }
        console.log(`[AuthForm CLIENT] =================================================================`);
      }
    } catch (err: any) {
      console.error("Auth System Error:", err);
      setError(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setIsForgotPassword(false);
    setError('');
    setMessage('');
    setIsUserRegistered(false);
    setNeedsConfirmation(false);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin + window.location.pathname,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage("Un email de récupération a été envoyé ! Vérifiez votre boîte de réception et vos spams (onglet Promotions/Courriers indésirables) pour réinitialiser votre mot de passe.");
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Une erreur est survenue lors de la demande de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <GoldBorderCard className="bg-[#0a0a0a] w-full max-w-md mx-auto shadow-2xl shadow-yellow-900/20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-1 tracking-tighter text-white">
            RÉINITIALISER <span className="text-yellow-500">MOT DE PASSE</span>
          </h2>
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Entrez votre adresse email pour recevoir un lien de réinitialisation sécurisé
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed flex items-start gap-3 animate-fade-in animate-duration-300">
              <AlertTriangle size={16} className="shrink-0 text-red-500" />
              <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-green-900/20 border border-green-500/30 text-green-400 p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed flex items-start gap-3 animate-fade-in animate-duration-300">
              <CheckCircle size={16} className="shrink-0 text-green-400" />
              <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <InputField 
            icon={Mail} 
            type="email" 
            placeholder="Adresse Email" 
            value={email} 
            onChange={(e: any) => setEmail(e.target.value)} 
          />

          <div className="pt-2">
            <PrimaryButton fullWidth isLoading={loading} type="submit">
              {loading ? <Loader2 className="animate-spin mx-auto text-black" /> : 'ENVOYER LE LIEN'}
            </PrimaryButton>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-white/5 pt-6">
          <button 
            type="button"
            onClick={() => { 
              setIsForgotPassword(false); 
              setError(''); 
              setMessage(''); 
            }}
            className="text-neutral-500 font-black hover:text-yellow-500 transition-colors uppercase text-[10px] tracking-widest"
          >
            ← Retour à la connexion
          </button>
        </div>
      </GoldBorderCard>
    );
  }

  return (
    <GoldBorderCard className="bg-[#0a0a0a] w-full max-w-md mx-auto shadow-2xl shadow-yellow-900/20">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black mb-1 tracking-tighter text-white">
          <span className="text-yellow-500">
            {isLogin ? 'CONNEXION' : 'INSCRIPTION'}
          </span> MZ+
        </h2>
        <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">
          {isLogin ? 'Accédez à votre dashboard Élite' : 'Rejoignez le cercle des Ambassadeurs'}
        </p>
      </div>

      {error && (
        <div className={`p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed flex items-start gap-3 animate-fade-in border ${
          isUserRegistered || needsConfirmation ? 'bg-blue-900/20 border-blue-500/30 text-blue-300' : 'bg-red-900/20 border-red-500/30 text-red-400'
        }`}>
            {isUserRegistered || needsConfirmation ? <CheckCircle size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />} 
            <div className="flex-1">
              <span>{error}</span>
              {(isUserRegistered || needsConfirmation) && (
                <button 
                  onClick={switchToLogin}
                  className="mt-2 flex items-center gap-2 text-white hover:text-yellow-500 transition-colors uppercase text-[9px] font-black tracking-widest"
                >
                  <LogIn size={10} /> Se connecter maintenant
                </button>
              )}
              {!isLogin && (error.toLowerCase().includes('déjà lié') || error.toLowerCase().includes('existe') || error.toLowerCase().includes('connecter')) && (
                <button 
                  type="button"
                  onClick={switchToLogin}
                  className="mt-2 flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors uppercase text-[9px] font-black tracking-widest"
                >
                  <LogIn size={10} /> Cliquer ici pour vous connecter
                </button>
              )}
              {isLogin && !needsConfirmation && (
                <div className="mt-2 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError('');
                      setMessage('');
                    }}
                    className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors uppercase text-[8px] font-black tracking-widest text-left"
                  >
                    <HelpCircle size={10} /> Réinitialiser par email (Supabase) ⚡
                  </button>
                  <a 
                    href="https://wa.me/237640608183?text=Besoin d'aide pour me connecter à mon compte MZ+"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors uppercase text-[8px] font-black tracking-widest"
                  >
                    <HelpCircle size={10} /> Mot de passe oublié ? Contacter le support WhatsApp
                  </a>
                </div>
              )}
            </div>
        </div>
      )}

      {message && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed animate-fade-in flex items-center gap-3">
            <CheckCircle size={16} className="shrink-0" />
            <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-1">
        {!isLogin && (
          <>
            <InputField icon={User} type="text" placeholder="Nom complet" value={name} onChange={(e: any) => setName(e.target.value)} />
            <div className="mb-3 font-sans">
              <div className="flex gap-2">
                <div className="w-[45%] relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6050]"><Globe size={14} /></div>
                  <select 
                    value={selectedDialCode} 
                    onChange={(e) => handleDialCodeChange(e.target.value)}
                    className="w-full bg-[#111009]/50 border border-[rgba(201,168,76,0.12)] rounded-xl py-3.5 pl-9 pr-6 text-white focus:border-[#C9A84C]/50 outline-none transition-all appearance-none text-xs"
                  >
                    {WHATSAPP_COUNTRY_CODES.map((opt) => (
                      <option key={opt.code} value={opt.code} className="bg-[#111009]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B6050]">
                    <ChevronRight size={12} className="rotate-90" />
                  </div>
                </div>
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2"><WhatsAppIcon size={14} /></div>
                  <input 
                    type="tel" 
                    placeholder="Numéro WhatsApp" 
                    value={localPhone} 
                    onChange={(e: any) => setLocalPhone(e.target.value)} 
                    required={true} 
                    className="w-full bg-[#111009]/50 border border-[rgba(201,168,76,0.12)] rounded-xl py-3.5 pl-9 pr-3 text-white focus:border-[#C9A84C]/50 outline-none transition-all placeholder:text-[#6B6050] text-xs" 
                  />
                </div>
              </div>
            </div>
          </>
        )}
        <InputField icon={Mail} type="email" placeholder="Adresse Email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
        <InputField icon={Key} type="password" placeholder="Mot de passe" value={password} onChange={(e: any) => setPassword(e.target.value)} />

        {isLogin && (
          <div className="flex justify-end pt-1 pb-3 px-1">
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(true);
                setError('');
                setMessage('');
              }}
              className="text-neutral-400 hover:text-yellow-500 transition-colors uppercase text-[9px] font-black tracking-widest flex items-center gap-1.5 focus:outline-none"
            >
              <HelpCircle size={10} className="text-yellow-500" /> Mot de passe oublié ?
            </button>
          </div>
        )}

        <div className="mt-8">
          <PrimaryButton fullWidth isLoading={loading} type="submit">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isLogin ? 'SE CONNECTER' : 'CRÉER MON COMPTE')}
          </PrimaryButton>
        </div>
      </form>

      <div className="mt-6 text-center border-t border-white/5 pt-6">
        <p className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">
          {isLogin ? 'Nouveau ici ?' : 'Déjà membre ?'}
          <button 
            type="button"
            onClick={() => { 
              setIsLogin(!isLogin); 
              setError(''); 
              setMessage(''); 
              setIsUserRegistered(false);
              setNeedsConfirmation(false);
            }}
            className="ml-2 text-yellow-500 font-black hover:text-yellow-400 transition-colors"
          >
            {isLogin ? 'S\'INSCRIRE MAINTENANT' : 'SE CONNECTER'}
          </button>
        </p>
      </div>
    </GoldBorderCard>
  );
};
