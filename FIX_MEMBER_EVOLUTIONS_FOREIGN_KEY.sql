-- ==========================================================
-- SCRIPT DE RÉSOLUTION DES CONTRAINTES DE L'IMPORTATION DES ÉVOLUTIONS
-- ==========================================================
-- Ce script désactive ou supprime de manière permanente la contrainte de clé étrangère
-- "member_evolutions_user_id_fkey" sur la table "member_evolutions".
--
-- Pourquoi ?
-- Lors de l'importation de données historiques de coaching/évolutions d'un ancien système,
-- les identifiants d'utilisateur (user_id) référencés dans les enregistrements historiques 
-- peuvent ne pas encore exister dans la nouvelle table "users". La contrainte de clé étrangère
-- bloque alors l'importation de ces historiques précieux.
--
-- Comme le système d'évolution stocke déjà de manière autonome les informations nécessaires
-- pour s'afficher (comme user_name, user_avatar, type, old_level, new_level, message...),
-- la contrainte de clé étrangère au niveau de la base de données n'est pas nécessaire et peut être retirée.
--
-- INSTRUCTIONS :
-- Copiez et exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase.

-- 1. Suppression de la contrainte de clé étrangère restrictive
ALTER TABLE public.member_evolutions 
DROP CONSTRAINT IF EXISTS member_evolutions_user_id_fkey;

-- 2. Optionnel : rendre la colonne user_id nullable si certains anciens partages n'avaient pas d'ID
ALTER TABLE public.member_evolutions 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Ajout d'un index d'optimisation pour les requêtes sur user_id 
-- même sans contrainte stricte, pour conserver des performances ultra-rapides
CREATE INDEX IF NOT EXISTS idx_member_evolutions_user_id ON public.member_evolutions(user_id);
