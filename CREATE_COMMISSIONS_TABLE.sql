-- ==========================================================
-- SCRIPT DE CRÉATION ET DE MISE EN CONFORMITÉ DES TABLES
-- public.products ET public.commissions
-- ==========================================================
-- Ce script s'assure d'abord que les extensions d'UUID et la table des produits (`public.products`)
-- existent, car elle est une dépendance essentielle (clé étrangère) de la table
-- des commissions (`public.commissions`).
-- Ensuite, il crée ou met en conformité la table `public.commissions`
-- pour y importer ou enregistrer les commissions de manière 100% fiable.
--
-- INSTRUCTIONS :
-- 1. Copiez l'intégralité SQL de ce script et collez-le dans le SQL Editor de Supabase.
-- 2. Exécutez-le d'un coup. Cela créera les deux tables manquantes sans toucher aux données
--    des autres tables !

-- Activer les extensions indispensables pour la génération sécurisée d'UUID si non existantes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. CRÉATION SÉCURISÉE DE LA TABLE PRODUCTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    final_link TEXT,
    chariow_product_id TEXT,
    theme TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Assurons-nous que toutes les colonnes de products existent si la table a déjà été créée d'une autre manière :
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS final_link TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS chariow_product_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());


-- ==========================================
-- 2. CRÉATION SÉCURISÉE DE LA TABLE COMMISSIONS (Version flexible et robuste pour import CSV)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID, -- Retrait de la contrainte STRICTE de clé étrangère pour accepter l'import de données existantes sans blocage
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AJOUT SÉCURISÉ DES COLONNES SI LA TABLE EXISTAIT DÉJÀ
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- SUPPRESSION DE LA CONTRAINTE DE CLÉ ÉTRANGÈRE SUR PRODUCTS POUR PERMETTRE L'IMPORT
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_product_id_fkey;
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_product_id_fkey1;

-- 3. AJOUT DE LA CONTRAINTE DE VALIDATION SUR LES ÉTATS DE LA COMMISSION
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_status_check;
ALTER TABLE public.commissions ADD CONSTRAINT commissions_status_check 
  CHECK (status IN ('pending', 'finalized', 'approved', 'rejected'));

-- 4. AJOUT DES INDEX RECOMMANDÉS POUR LES PERFORMANCES ET RECHERCHES
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_product_id ON public.commissions(product_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON public.commissions(created_at);

-- 5. RELOAD SCHEMA CACHE POUR SUPABASE API
NOTIFY pgrst, 'reload schema';
