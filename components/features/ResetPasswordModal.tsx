import React, { useState } from 'react';
import { Key, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabase.ts';
import { GoldBorderCard, InputField, PrimaryButton } from '../UI.tsx';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (title: string, body: string, type: 'info' | 'error' | 'warning') => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onNotify }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPassword || !cleanConfirm) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (cleanPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: cleanPassword,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      onNotify(
        "Succès !",
        "Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant utiliser l'application.",
        "info"
      );
      
      // Delay closing to let user see success state, then refresh or close
      setTimeout(() => {
        onClose();
        // Remove hash params safely
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        // Force session refresh or page reload to ensure everything is synced
        window.location.reload();
      }, 2500);

    } catch (err: any) {
      console.error("Error updating password:", err);
      setError(err.message || "Impossible de réinitialiser le mot de passe.");
      onNotify("Erreur", err.message || "Impossible de réinitialiser le mot de passe.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-hidden font-sans">
      <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>

      <div className="relative w-full max-w-sm animate-fade-in pointer-events-auto">
        <GoldBorderCard className="bg-[#0b0b0a] border border-yellow-500/20 shadow-2xl shadow-yellow-500/10 p-8 rounded-[2rem]">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-yellow-500">
              <Key size={24} />
            </div>
            <h3 className="text-lg font-black uppercase text-white tracking-tight">
              Nouveau mot de passe
            </h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
              Configurez vos nouveaux accès sécurisés
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed flex items-start gap-3 animate-fade-in">
              <AlertTriangle size={16} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-500/30 text-green-400 p-4 rounded-xl mb-6 text-xs font-bold leading-relaxed flex items-start gap-3 animate-fade-in">
              <CheckCircle size={16} className="shrink-0 text-green-500" />
              <span>Votre mot de passe a été modifié avec succès ! Connexion automatique en cours...</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                icon={Key}
                type="password"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
              />

              <InputField
                icon={Key}
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e: any) => setConfirmPassword(e.target.value)}
              />

              <div className="pt-2">
                <PrimaryButton fullWidth isLoading={loading} type="submit">
                  {loading ? <Loader2 className="animate-spin mx-auto text-black" /> : 'ENREGISTRER LE MOT DE PASSE'}
                </PrimaryButton>
              </div>
            </form>
          )}
        </GoldBorderCard>
      </div>
    </div>
  );
};
