-- ====================================================================
-- SCRIPT DE CORRECTION DES INSCRIPTIONS ET RESTAURATION DES UTILISATEURS
-- À copier et coller entièrement dans l'éditeur SQL de Supabase (SQL Editor)
-- ====================================================================

-- 1. CORRECTION DE LA FONCTION TRIGGER DE SÉCURITÉ
-- Le trigger précédent échouait systématiquement lors de l'INSERTION (l'inscription)
-- car il tentait de lire l'ancienne ligne (OLD) qui n'existe pas lors d'un INSERT.
-- Nous l'encapsulons dans une condition "IF TG_OP = 'UPDATE'" pour qu'il ne s'applique que lors des modifications.

CREATE OR REPLACE FUNCTION public.protect_admin_status_strict()
RETURNS TRIGGER AS $$
BEGIN
    -- Protection 1 : Interdit de donner des droits admin à un autre email que google@gmail.com
    IF (NEW.is_admin = true OR NEW.admin_role IS NOT NULL) THEN
        IF NEW.email IS DISTINCT FROM 'google@gmail.com' THEN
            RAISE EXCEPTION 'Action interdite : Seul le compte de l''administrateur officiel peut posséder des privilèges administrateur.';
        END IF;
    END IF;
    
    -- Protection 2 : Seul l'administrateur google@gmail.com connecté est autorisé à modifier le rôle admin (uniquement lors de la mise à jour 'UPDATE')
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin OR OLD.admin_role IS DISTINCT FROM NEW.admin_role) THEN
            IF auth.email() IS DISTINCT FROM 'google@gmail.com' THEN
                RAISE EXCEPTION 'Action interdite : Seule la console de sécurité de google@gmail.com peut modifier les rôles administrateur.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RECRÉATION SÉCURISÉE DU TRIGGER
DROP TRIGGER IF EXISTS tr_protect_admin_status_strict ON public.users;
CREATE TRIGGER tr_protect_admin_status_strict
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_status_strict();

-- 3. RESTAURATION ET SYNCHRONISATION AUTOMATIQUE DES PROFILS MANQUANTS
-- Ce script identifie tous les utilisateurs inscrits dans auth.users qui n'ont pas de profil 
-- dans public.users (les 50 utilisateurs bloqués) et leur crée un profil propre automatiquement
-- pour débloquer leur compte instantanément !

INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    referral_code, 
    rank_id, 
    rank_name,
    user_level, 
    rpa_points, 
    rpa_balance, 
    created_at, 
    updated_at
)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', 'Ambassadeur'),
    -- Génération d'un code de parrainage unique basé sur l'ID pour éviter les conflits
    'MZ' || UPPER(SUBSTRING(au.id::text FROM 1 FOR 6)),
    1, 
    'DÉBUTANT', 
    'standard', 
    0, 
    0.0, 
    COALESCE(au.created_at, now()), 
    COALESCE(au.updated_at, now())
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. AUTORISATION DES POLITIQUES DE LECTURE (SELECT) ET ÉCRITURE (INSERT) POUR LES UTILISATEURS
-- S'assure que tout utilisateur connecté peut lire les profils de la table public.users (important pour les parrainages, le parrain et le leaderboard)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
CREATE POLICY "Enable read access for all users" ON public.users
    FOR SELECT
    USING (true);

-- S'assure que les utilisateurs peuvent insérer leur propre profil s'ils s'inscrivent directement depuis l'application
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
CREATE POLICY "Enable insert for authenticated users only" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. RELOAD SCHEMA CACHE POUR NOTIFIER POSTGREST
NOTIFY pgrst, 'reload schema';
