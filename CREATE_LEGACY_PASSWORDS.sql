-- =====================================================================
-- TABLE DE MIGRATION SÉCURISÉE DES ANCIENS MOTS DE PASSE (LEGACY USERS)
-- A exécuter dans l'éditeur de requêtes SQL de Supabase
-- =====================================================================

-- 1. Création de la table pour stocker les anciens identifiants de manière sécurisée
CREATE TABLE IF NOT EXISTS public.legacy_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT, -- Contient le mot de passe récupéré (peut être NULL si absent d'un utilisateur)
    migrated BOOLEAN DEFAULT FALSE NOT NULL,
    migrated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index de recherche rapide sur l'email pour réactivité optimale lors du login
CREATE INDEX IF NOT EXISTS idx_legacy_passwords_email ON public.legacy_passwords (email);

-- 3. SÉCURITÉ DRASTIQUE (RLS) : Interdire STRICTEMENT tout accès direct depuis le client web
ALTER TABLE public.legacy_passwords ENABLE ROW LEVEL SECURITY;

-- En n'ajoutant AUCUNE policy de lecture/écriture pour PUBLIC, anon ou authenticated sur cette table,
-- TOUTES les requêtes faites depuis l'API cliente standard de Supabase (Navigateur Web) seront
-- systématiquement bloquées (Retourne 0 ligne).
-- Seul notre serveur backend Node.js (via la clé admin SUPABASE_SERVICE_ROLE_KEY) aura la permission
-- de lire, comparer, modifier ou supprimer les données de cette table.
