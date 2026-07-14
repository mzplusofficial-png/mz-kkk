-- ====================================================================
-- SCRIPT DE MIGRATION : AJOUT DE LA VALIDATION DE COMPTE (IS_ACTIVE)
-- À copier et coller entièrement dans l'éditeur SQL de Supabase (SQL Editor)
-- ====================================================================

-- 1. Ajout de la colonne is_active si elle n'existe pas, avec DEFAULT false pour les nouvelles inscriptions
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 2. Pour éviter de bloquer les utilisateurs déjà inscrits, on active tous les comptes existants par défaut
UPDATE public.users SET is_active = true WHERE is_active IS NULL;

-- 3. On s'assure que les administrateurs clés et les comptes officiels sont bien marqués comme actifs
UPDATE public.users 
SET is_active = true, is_admin = true
WHERE LOWER(email) IN (
    'google@gmail.com', 
    'millionaireobject@gmail.com', 
    'mzplus1@gmail.com', 
    'utilisateur26@gmail.com', 
    'ivan1@gmail.com', 
    'mr.sahaivan@gmail.com'
);

-- 4. Recharger le cache de PostgREST pour appliquer les modifications d'API Supabase immédiatement
NOTIFY pgrst, 'reload schema';
