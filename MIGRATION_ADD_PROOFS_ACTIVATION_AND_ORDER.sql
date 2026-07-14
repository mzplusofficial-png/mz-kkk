-- ==============================================================================
-- SQL MIGRATION: AJOUT DES DERNIÈRES FONCTIONNALITÉS POUR LES PREUVES PREMIUM
-- BUT : Supporter la modification complète, l'activation/désactivation,
--       l'ordre d'affichage et la gamification avancée (badges d'accomplissements).
-- ==============================================================================
--
-- INSTRUCTIONS :
-- 1. Copiez l'intégralité de ce code.
-- 2. Allez sur votre tableau de bord Supabase -> SQL Editor.
-- 3. Ouvrez une nouvelle requête (New Query), collez ce code et cliquez sur "Run".
--

-- 1. Ajout sécurisé des nouvelles colonnes à la table mz_premium_proofs si non existantes
ALTER TABLE public.mz_premium_proofs ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.mz_premium_proofs ADD COLUMN IF NOT EXISTS award_type TEXT DEFAULT 'first_sale';
ALTER TABLE public.mz_premium_proofs ADD COLUMN IF NOT EXISTS milestone_title TEXT DEFAULT '';
ALTER TABLE public.mz_premium_proofs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.mz_premium_proofs ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Notification de mise à jour du schéma
NOTIFY pgrst, 'reload schema';
