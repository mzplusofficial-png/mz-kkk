-- ==========================================================
-- SCRIPT DE CRÉATION ET DE MISE EN CONFORMITÉ DE LA TABLE public.users
-- ==========================================================
-- Ce script crée la table `public.users` complète pour importer vos données
-- existantes (depuis votre fichier CSV). Il garantit que toutes les colonnes requises
-- par le CSV ainsi que par le code de l'application sont présentes (y compris 'country').
--
-- INSTRUCTIONS :
-- 1. Si vous voulez RECRÉER à zéro la table (attention, cela efface les données actuelles de cette table) :
--    Décommentez la ligne de DROP ci-dessous.
-- 2. Si vous voulez simplement AJOUTER les colonnes manquantes sans perdre vos données existantes :
--    Exécutez ce script directement pour effectuer les "ALTER TABLE IF NOT EXISTS".

-- DROP TABLE IF EXISTS public.users CASCADE;

-- 1. CRÉATION DE LA TABLE USERS SI ELLE N'EXISTE PAS WITH ALL COLUMNS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    username TEXT,
    phone TEXT,
    avatar_url TEXT,
    country TEXT,
    country_code TEXT,
    is_admin BOOLEAN DEFAULT false,
    admin_role TEXT,
    is_active BOOLEAN DEFAULT true,
    user_level TEXT DEFAULT 'standard',
    referral_code TEXT,
    referral_code_used TEXT,
    sponsor_id UUID,
    xp INTEGER DEFAULT 0,
    weekly_xp INTEGER DEFAULT 0,
    monthly_xp INTEGER DEFAULT 0,
    last_xp_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
    rank_id INTEGER DEFAULT 1,
    rank_name TEXT DEFAULT 'DÉBUTANT',
    fcm_token TEXT,
    last_fcm_sync TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_premium_trigger_at TIMESTAMP WITH TIME ZONE,
    premium_trigger_history JSONB DEFAULT '[]'::jsonb,
    store_preferences JSONB DEFAULT '{}'::jsonb,
    has_seen_flash_offer BOOLEAN DEFAULT false,
    rpa_points INTEGER DEFAULT 0,
    rpa_balance NUMERIC DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. AJOUT SÉCURISÉ DES COLONNES SI LA TABLE EXISTAIT DÉJÀ (Pour éviter l'erreur d'import CSV)
-- Ce bloc s'assure qu'absolument toutes les colonnes requises par le CSV et l'App sont bien présentes !
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_role TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_level TEXT DEFAULT 'standard';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code_used TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sponsor_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS weekly_xp INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS monthly_xp INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_xp_update TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rank_id INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rank_name TEXT DEFAULT 'DÉBUTANT';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_fcm_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_premium_trigger_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS premium_trigger_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS store_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_seen_flash_offer BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rpa_points INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rpa_balance NUMERIC DEFAULT 0.0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. AJOUT DES INDEX DE RECHERCHE RAPIDE (RECOMMANDÉ)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON public.users(fcm_token);

-- 4. RÉTABLISSEMENT DES CONTRAINTES DE CLÉ ÉTRANGÈRE SÉCURISÉES (SI RANKS EXISTE)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ranks' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_rank_id_fkey') THEN
            ALTER TABLE public.users ADD CONSTRAINT users_rank_id_fkey FOREIGN KEY (rank_id) REFERENCES public.ranks(id);
        END IF;
    END IF;
END $$;

-- 5. RELOAD SCHEMA CACHE POUR SUPABASE API
NOTIFY pgrst, 'reload schema';
