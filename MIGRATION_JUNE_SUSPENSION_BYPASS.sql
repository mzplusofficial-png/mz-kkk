-- ====================================================================
-- MIGRATION & ADMINISTRATION : CONTOURNEMENT DE LA SUSPENSION DU 19 JUIN
-- ====================================================================
-- Ce script SQL vous permet d'accorder ou de retirer le privilège de contournement (bypass)
-- de la suspension de plateforme du 19 juin pour des utilisateurs spécifiques, directement depuis
-- votre éditeur SQL Supabase.
--
-- Le code de l'application prend en charge deux méthodes complémentaires :
-- 1. La méthode par JSONB dans la colonne "store_preferences" (Zéro modification de structure de table !)
-- 2. La méthode par colonne dédiée "bypass_suspension" (Propre, indexable, performante !)
--
-- Choisissez l'option qui vous convient le mieux ci-dessous.

-- ====================================================================
-- OPTION 1 : SANS MODIFICATION DE TABLE (Méthode store_preferences JSONB)
-- ====================================================================

-- 1. Accorder l'accès à un utilisateur via sa colonne "store_preferences" (par e-mail) :
UPDATE users 
SET store_preferences = COALESCE(store_preferences, '{}'::jsonb) || '{"bypass_suspension": true}'::jsonb
WHERE LOWER(email) = LOWER('VIP_USER_EMAIL@GMAIL.COM');

-- 2. Accorder l'accès à un utilisateur (par son identifiant ID UUID) :
UPDATE users 
SET store_preferences = COALESCE(store_preferences, '{}'::jsonb) || '{"bypass_suspension": true}'::jsonb
WHERE id = 'VOTRE-UUID-UTILISATEUR';

-- 3. Retirer l'accès de contournement à un utilisateur :
UPDATE users 
SET store_preferences = COALESCE(store_preferences, '{}'::jsonb) || '{"bypass_suspension": false}'::jsonb
WHERE LOWER(email) = LOWER('VIP_USER_EMAIL@GMAIL.COM');

-- 4. Lister tous les utilisateurs ordinaires ayant le privilège de contournement via JSONB :
SELECT id, full_name, email, user_level, is_admin
FROM users 
WHERE store_preferences->>'bypass_suspension' = 'true';


-- ====================================================================
-- OPTION 2 : MÉTHODE PLUS PROPRE (Création d'une colonne de table dédiée)
-- ====================================================================

-- 1. Créez d'abord la colonne dédiée dans la table "users" (à n'exécuter qu'une seule fois) :
ALTER TABLE users ADD COLUMN IF NOT EXISTS bypass_suspension BOOLEAN DEFAULT FALSE;

-- 2. Accorder l'accès de contournement à un utilisateur (par e-mail) :
UPDATE users 
SET bypass_suspension = TRUE 
WHERE LOWER(email) = LOWER('VIP_USER_EMAIL@GMAIL.COM');

-- 3. Accorder l'accès de contournement à un utilisateur (par ID UUID) :
UPDATE users 
SET bypass_suspension = TRUE 
WHERE id = 'VOTRE-UUID-UTILISATEUR';

-- 4. Retirer l'accès de contournement à un utilisateur :
UPDATE users 
SET bypass_suspension = FALSE 
WHERE LOWER(email) = LOWER('VIP_USER_EMAIL@GMAIL.COM');

-- 5. Lister tous les utilisateurs ordinaires ainsi whitelistés par la colonne dédiée :
SELECT id, full_name, email, user_level, is_admin, bypass_suspension
FROM users 
WHERE bypass_suspension = TRUE;
