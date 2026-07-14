-- ==============================================================================
-- SQL MIGRATION: CRÉATION ET SEEDING COMPLET DES PREUVES PREMIUM (MZ_PREMIUM_PROOFS)
-- BUT : Créer la table, configurer toutes les politiques de sécurité (RLS), et
--       insérer directement les preuves réelles avec leurs liens Google Drive.
-- ==============================================================================
--
-- INSTRUCTIONS DE DÉPLOIEMENT :
-- 1. Connectez-vous à votre tableau de bord Supabase (https://supabase.com).
-- 2. Allez dans la section "SQL Editor" de votre projet.
-- 3. Créez une nouvelle requête ("New Query").
-- 4. Copiez et collez l'intégralité du code ci-dessous.
-- 5. Cliquez sur le bouton "Run" pour exécuter la requête.
--
-- ==============================================================================

-- 1. S'assurer que les extensions nécessaires sont présentes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Suppression de l'ancienne table si elle existe pour s'assurer que ses colonnes sont parfaitement à jour
DROP TABLE IF EXISTS public.mz_premium_proofs CASCADE;

-- 3. Création de la table mz_premium_proofs avec l'intégralité des colonnes requises
CREATE TABLE public.mz_premium_proofs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    before_amount TEXT DEFAULT '0 FCFA',
    after_amount TEXT NOT NULL,
    time_frame TEXT NOT NULL,
    before_image_url TEXT DEFAULT '',
    after_image_url TEXT NOT NULL,
    description TEXT DEFAULT '',
    award_type TEXT DEFAULT 'exceptional_result',
    milestone_title TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    country_flag TEXT DEFAULT '🌍 Afrique',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Activation du Row Level Security (RLS)
ALTER TABLE public.mz_premium_proofs ENABLE ROW LEVEL SECURITY;

-- 4. Configuration des politiques de sécurité d'accès public et administratif
DROP POLICY IF EXISTS "Lecture publique des preuves" ON public.mz_premium_proofs;
CREATE POLICY "Lecture publique des preuves" 
ON public.mz_premium_proofs FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Insertion des preuves par les admins" ON public.mz_premium_proofs;
CREATE POLICY "Insertion des preuves par les admins" 
ON public.mz_premium_proofs FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Mise a jour des preuves par les admins" ON public.mz_premium_proofs;
CREATE POLICY "Mise a jour des preuves par les admins" 
ON public.mz_premium_proofs FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Suppression des preuves par les admins" ON public.mz_premium_proofs;
CREATE POLICY "Suppression des preuves par les admins" 
ON public.mz_premium_proofs FOR DELETE 
USING (true);

-- 5. Suppression des anciens records de test pour éviter les doublons ou données erronées
TRUNCATE TABLE public.mz_premium_proofs RESTART IDENTITY CASCADE;

-- 6. Insertion des preuves réelles fournies (avec les pièces jointes Google Drive officielles)
INSERT INTO public.mz_premium_proofs (
    id,
    name,
    before_amount,
    after_amount,
    time_frame,
    before_image_url,
    after_image_url,
    description,
    award_type,
    milestone_title,
    is_active,
    sort_order,
    country_flag
) VALUES 
(
    'fb100000-0000-0000-0000-000000000001',
    'Souffa Bakari',
    '0 FCFA',
    '350 000 FCFA',
    'En 18 jours',
    'https://drive.google.com/file/d/1ufBs7y_MYdOcw9st0BpScHoy_3hV26jW/view?usp=sharing',
    'https://drive.google.com/file/d/1ufBs7y_MYdOcw9st0BpScHoy_3hV26jW/view?usp=sharing',
    'Une réussite marquante de Souffa Bakari qui de 0 est passé à un total de 350 000 FCFA en seulement 18 jours de travail !',
    'exceptional_result',
    'Dépassement d''espoir',
    true,
    1,
    '🇨🇮 Côte d''Ivoire'
),
(
    'fb100000-0000-0000-0000-000000000002',
    'Aladin Moussa',
    '0 FCFA',
    '475 000 XAF',
    'En 28 jours',
    '',
    'https://drive.google.com/file/d/1vKMy7iKAc4yUaNI-kClV9ovGKbe8HiWK/view?usp=sharing',
    'Détermination et persévérance payantes ! Aladin Moussa a généré 475 000 XAF de profit en moins d''un mois (28 jours) !',
    'first_sale',
    'Premiers gains majeurs',
    true,
    2,
    '🇨🇲 Cameroun'
),
(
    'fb100000-0000-0000-0000-000000000003',
    'Mr. YAMIS',
    '0 FCFA',
    '60 000 FCFA',
    'En 7 jours',
    '',
    'https://drive.google.com/file/d/1bQ7DOPjp_xuLD6jdo_NKxquUjOsGbIJe/view?usp=sharing',
    'Une merveilleuse entrée en matière pour Mr. YAMIS avec 60 000 FCFA cumulés lors de sa première semaine d''activité !',
    'first_withdrawal',
    'Première victoire',
    true,
    3,
    '🇸🇳 Sénégal'
);

-- 7. Notification de rechargement du schéma postgrest
NOTIFY pgrst, 'reload schema';
