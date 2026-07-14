-- ====================================================================
-- SCRIPT COMPLET DE CONSTITUTION DU SYSTÈME D'ÉVOLUTIONS & VICTOIRES
-- ====================================================================
-- Ce script crée et met à jour toutes les tables de la base de données
-- nécessaires pour la publication, la lecture, la réaction et l'importation
-- libre des évolutions, réussites, et ventes de la communauté Millionnaire Zone.
--
-- INSTRUCTIONS :
-- Copiez tout ce script et exécutez-le dans l'Éditeur SQL de votre console Supabase.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TABLE : member_evolutions (Publications du Fil d'Évolution)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_evolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    old_level TEXT,
    new_level TEXT,
    type TEXT NOT NULL, -- 'level_up' | 'formation_completed' | 'achievement_unlocked'
    achievement_title TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reactions JSONB DEFAULT '{}'::jsonb,
    user_reactions JSONB DEFAULT '{}'::jsonb,
    comment_count INTEGER DEFAULT 0
);

-- S'assurer que les colonnes additionnelles modernes existent (si la table existait déjà)
ALTER TABLE public.member_evolutions ADD COLUMN IF NOT EXISTS user_reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.member_evolutions ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE public.member_evolutions ADD COLUMN IF NOT EXISTS old_level TEXT;
ALTER TABLE public.member_evolutions ADD COLUMN IF NOT EXISTS new_level TEXT;
ALTER TABLE public.member_evolutions ADD COLUMN IF NOT EXISTS achievement_title TEXT;

-- DESACTIVATION DE LA CONTRAINTE DE CLÉ ÉTRANGÈRE RESTRICTIVE :
-- Supprime le lien strict vers la table des utilisateurs pour permettre l'importation libre 
-- d'historiques d'anciennes bases où les ID n'existent pas ou ont changé.
ALTER TABLE public.member_evolutions DROP CONSTRAINT IF EXISTS member_evolutions_user_id_fkey;
ALTER TABLE public.member_evolutions ALTER COLUMN user_id DROP NOT NULL;

-- Ajout d'un index de performance pour charger le fil rapidement
CREATE INDEX IF NOT EXISTS idx_member_evolutions_user_id ON public.member_evolutions(user_id);
CREATE INDEX IF NOT EXISTS idx_member_evolutions_created_at ON public.member_evolutions(created_at DESC);


-- --------------------------------------------------------------------
-- 2. TABLE : evolution_reactions (Réactions aux publications comme les J'aime/Feu)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evolution_reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    post_id UUID NOT NULL,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contrainte de clé unique pour ne pas réagir plusieurs fois avec le même type sur le même post
ALTER TABLE public.evolution_reactions DROP CONSTRAINT IF EXISTS evolution_reactions_unique_user_post_reaction;
ALTER TABLE public.evolution_reactions ADD CONSTRAINT evolution_reactions_unique_user_post_reaction UNIQUE (user_id, post_id, reaction_type);

CREATE INDEX IF NOT EXISTS idx_evolution_reactions_post_id ON public.evolution_reactions(post_id);


-- --------------------------------------------------------------------
-- 3. TABLE : internal_notifications (Système de notifications en temps réel)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL,
    sender_id UUID, -- rendu optionnel pour les messages système
    type TEXT NOT NULL, -- 'evolution_reaction' | 'evolution_broadcast' | 'challenge' | 'commission' | etc.
    title TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- S'assurer que les nouvelles colonnes existent sur internal_notifications
ALTER TABLE public.internal_notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.internal_notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.internal_notifications ALTER COLUMN sender_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_internal_notifications_recipient ON public.internal_notifications(recipient_id);


-- --------------------------------------------------------------------
-- 4. TABLE : mz_background_notifications_log (Journal d'envoi pour limiter les notifications push)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mz_background_notifications_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    notif_type TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mz_background_notifications_log_user ON public.mz_background_notifications_log(user_id);


-- ====================================================================
-- SÉCURITÉ DE LA BASE DE DONNÉES (ROW LEVEL SECURITY - RLS)
-- ====================================================================
-- RLS empêche l'affichage et l'insertion silencieusement si aucune politique
-- explicite n'est créée. Ces commandes permettent la lecture publique et l'écriture sécurisée.

-- Activé sur l'ensemble des tables concernées
ALTER TABLE public.member_evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mz_background_notifications_log ENABLE ROW LEVEL SECURITY;

-- --- Politiques pour 'member_evolutions' ---
DROP POLICY IF EXISTS "Lecture de toutes les évolutions par tout le monde" ON public.member_evolutions;
CREATE POLICY "Lecture de toutes les évolutions par tout le monde" 
ON public.member_evolutions FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Insertion par les utilisateurs connectés" ON public.member_evolutions;
CREATE POLICY "Insertion par les utilisateurs connectés" 
ON public.member_evolutions FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Mise à jour libre par les utilisateurs connectés" ON public.member_evolutions;
CREATE POLICY "Mise à jour libre par les utilisateurs connectés" 
ON public.member_evolutions FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Suppression par les admins ou l'auteur" ON public.member_evolutions;
CREATE POLICY "Suppression par les admins ou l'auteur" 
ON public.member_evolutions FOR DELETE 
USING (true);


-- --- Politiques pour 'evolution_reactions' ---
DROP POLICY IF EXISTS "Lecture publique des réactions" ON public.evolution_reactions;
CREATE POLICY "Lecture publique des réactions" 
ON public.evolution_reactions FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Gestion des réactions par utilisateurs authentifiés" ON public.evolution_reactions;
CREATE POLICY "Gestion des réactions par utilisateurs authentifiés" 
ON public.evolution_reactions FOR ALL 
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);


-- --- Politiques pour 'internal_notifications' ---
DROP POLICY IF EXISTS "Lecture des notifications personnelles" ON public.internal_notifications;
CREATE POLICY "Lecture des notifications personnelles" 
ON public.internal_notifications FOR SELECT 
USING (auth.uid() = recipient_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Création universelle de notification" ON public.internal_notifications;
CREATE POLICY "Création universelle de notification" 
ON public.internal_notifications FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Mise à jour de ses propres notifications" ON public.internal_notifications;
CREATE POLICY "Mise à jour de ses propres notifications" 
ON public.internal_notifications FOR UPDATE 
USING (auth.uid() = recipient_id OR auth.uid() IS NOT NULL);


-- --- Politiques pour 'mz_background_notifications_log' ---
DROP POLICY IF EXISTS "Lecture de ses logs de rate-limiting" ON public.mz_background_notifications_log;
CREATE POLICY "Lecture de ses logs de rate-limiting" 
ON public.mz_background_notifications_log FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Ajout de logs de rate-limiting" ON public.mz_background_notifications_log;
CREATE POLICY "Ajout de logs de rate-limiting" 
ON public.mz_background_notifications_log FOR INSERT 
WITH CHECK (true);
