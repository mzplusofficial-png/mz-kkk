-- ====================================================================
-- SCRIPT DE MIGRATION : AJOUT DE LA VALIDATION DE COMPTE (IS_ACTIVE)
-- À copier et coller entièrement dans l'éditeur SQL de Supabase (SQL Editor)
-- ====================================================================

-- 1. Ajout de la colonne is_active si elle n'existe pas
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 2. SI LA COLONNE EXISTE DÉJÀ (car créée par d'anciens scripts avec un DEFAULT true), 
-- on force explicitement sa valeur par défaut à FALSE pour toutes les futures inscriptions !
ALTER TABLE public.users ALTER COLUMN is_active SET DEFAULT false;

-- 3. Pour éviter de bloquer les utilisateurs déjà inscrits, on active tous les comptes existants par défaut
UPDATE public.users SET is_active = true WHERE is_active IS NULL;

-- 4. On s'assure que les administrateurs clés et les comptes officiels sont bien marqués comme actifs
UPDATE public.users 
SET is_active = true
WHERE LOWER(email) IN (
    'google@gmail.com', 
    'millionaireobject@gmail.com', 
    'mzplus1@gmail.com', 
    'utilisateur26@gmail.com', 
    'ivan1@gmail.com', 
    'mr.sahaivan@gmail.com'
);

-- 5. Recharger le cache de PostgREST pour appliquer les modifications d'API Supabase immédiatement
NOTIFY pgrst, 'reload schema';
