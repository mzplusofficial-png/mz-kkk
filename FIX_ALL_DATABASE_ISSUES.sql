-- ====================================================================
-- COPIER ET COLLER CE SCRIPT ENTIER DANS L'ÉDITEUR SQL SUPABASE (SQL Editor)
-- POUR RÉSOUDRE TOUTES LES ERREURS LIÉES À LA BASE DE DONNÉES EN 1 CLIC.
-- ====================================================================

-- 1. CORRECTION DE LA TABLE DE TEMPS (mz_rewards_time_tracking)
-- Ajout de la colonne last_ping si absente (cause de l'erreur 400 Bad Request)
ALTER TABLE public.mz_rewards_time_tracking ADD COLUMN IF NOT EXISTS last_ping TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. RE-CRÉATION DE LA FONCTION POUR LE BATTEMENT DE COEUR (mz_rewards_heartbeat)
CREATE OR REPLACE FUNCTION public.mz_rewards_heartbeat(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.mz_rewards_time_tracking (user_id, tracking_date, total_minutes, last_ping)
    VALUES (p_user_id, CURRENT_DATE, 1, now())
    ON CONFLICT (user_id, tracking_date) DO UPDATE
    SET total_minutes = mz_rewards_time_tracking.total_minutes + 1,
        last_ping = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CRÉATION DE LA TABLE DES SÉRIES D'ACTIVITÉ (user_activity_streaks)
CREATE TABLE IF NOT EXISTS public.user_activity_streaks (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    consecutive_days INTEGER DEFAULT 1,
    last_active_date DATE DEFAULT CURRENT_DATE,
    streak_3d_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activer la sécurité au niveau des lignes (RLS)
ALTER TABLE public.user_activity_streaks ENABLE ROW LEVEL SECURITY;

-- Création des politiques RLS de lecture/écriture/mise à jour pour la table des séries d'activité
DROP POLICY IF EXISTS "Users can read own streak" ON public.user_activity_streaks;
CREATE POLICY "Users can read own streak" ON public.user_activity_streaks 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own streak" ON public.user_activity_streaks;
CREATE POLICY "Users can update own streak" ON public.user_activity_streaks 
    FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own streak" ON public.user_activity_streaks;
CREATE POLICY "Users can insert own streak" ON public.user_activity_streaks 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access streak" ON public.user_activity_streaks;
CREATE POLICY "Admin full access streak" ON public.user_activity_streaks 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND (users.is_admin = true OR users.admin_role IS NOT NULL)
        )
    );

-- 4. CORRECTION DE LA TABLE DES RANGS (ranks) AVEC LES COLONNES MANQUANTES
ALTER TABLE public.ranks ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.ranks ADD COLUMN IF NOT EXISTS min_points INTEGER DEFAULT 0;
