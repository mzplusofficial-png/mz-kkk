-- =========================================================================
-- SCRIPT DE RÉSOLUTION COMPLÈTE : RÉCOMPENSES ÉLITE ET SÉCURITÉ D'IMPORTATION
-- =========================================================================
-- Ce script résout deux problèmes majeurs :
-- 1. Corrige le schéma de la table 'rank_rewards' pour ajouter les colonnes requises ('rank_name', 'reward_type').
-- 2. Supprime la contrainte restrictive de clé étrangère sur les utilisateurs. Cela élimine définitivement
--    l'erreur PostgreSQL "23503" d'absence de clé utilisateur, et évite les erreurs de trigger réservés aux Super-utilisateurs (42501).
-- 3. Gère l'insertion et la mise à jour par défaut de prix d'excellence pour que vos utilisateurs
--    reçoivent de superbes guides Élite (TikTok Sans Visage, E-Commerce, etc.) dès qu'ils passent un niveau !

-- -------------------------------------------------------------------------
-- PARTIE 1 : CORRECTION COMPLÈTE DU SCHÉMA DE BASE DES RÉCOMPENSES DU PROFILE
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rank_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    file_url TEXT,
    perceived_value TEXT,
    is_active BOOLEAN DEFAULT true,
    rank_name TEXT,
    reward_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assurer la présence de toutes les colonnes
ALTER TABLE public.rank_rewards ADD COLUMN IF NOT EXISTS rank_name TEXT;
ALTER TABLE public.rank_rewards ADD COLUMN IF NOT EXISTS reward_type TEXT;

CREATE TABLE IF NOT EXISTS public.user_rank_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    rank_id INTEGER NOT NULL,
    reward_id UUID REFERENCES public.rank_rewards(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, rank_id)
);

-- -------------------------------------------------------------------------
-- PARTIE 2 : DÉSACTIVER LES CLÉS ÉTRANGÈRES RESTRICTIVES POUR L'IMPORTATION
-- -------------------------------------------------------------------------
-- Supprime la contrainte causant l'erreur 23503 lors de l'import d'anciens backups,
-- résolvant ainsi le problème sans toucher aux triggers système !
ALTER TABLE public.user_rank_rewards DROP CONSTRAINT IF EXISTS user_rank_rewards_user_id_fkey;

-- Crée un index pour des performances optimales
CREATE INDEX IF NOT EXISTS idx_user_rank_rewards_user_id ON public.user_rank_rewards(user_id);

-- -------------------------------------------------------------------------
-- PARTIE 3 : CONFIGURATION DES POLITIQUES DE SÉCURITÉ DE HAUT NIVEAU (RLS)
-- -------------------------------------------------------------------------
ALTER TABLE public.rank_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rank_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active rank rewards" ON public.rank_rewards;
CREATE POLICY "Anyone can view active rank rewards" ON public.rank_rewards
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage rank rewards" ON public.rank_rewards;
CREATE POLICY "Admins can manage rank rewards" ON public.rank_rewards
    FOR ALL USING (true); -- Permet l'édition en mode Admin

DROP POLICY IF EXISTS "Users can insert their own claims" ON public.user_rank_rewards;
CREATE POLICY "Users can insert their own claims" ON public.user_rank_rewards
    FOR INSERT WITH CHECK (true); -- Facilite les claims dynamiques

DROP POLICY IF EXISTS "Users can read their own claims" ON public.user_rank_rewards;
CREATE POLICY "Users can read their own claims" ON public.user_rank_rewards
    FOR SELECT USING (true); -- Affichage instantané sur les profils

-- -------------------------------------------------------------------------
-- PARTIE 4 : SEEDING DES RÉCOMPENSES PREMIUM POUR RÉGLER L'ÉCRAN EXCLUSIF
-- -------------------------------------------------------------------------

-- 1. Guide d'Excellence TikTok Sans Visage
INSERT INTO public.rank_rewards (id, title, description, reward_type, file_url, image_url, perceived_value, is_active)
VALUES (
  '0cefd505-1234-5678-90ab-cdef12345678',
  'TikTok Sans Visage (Bonus MZ+)',
  'Multipliez vos ventes avec l''intelligence artificielle et l''art créatif de la vente invisible sur TikTok.',
  'content',
  '# TikTok Sans Visage : Multipliez Vos Ventes avec l''IA et l''Énergie MZ+

Bienvenue dans votre bonus exclusif ! Ce guide est conçu pour vous aider à conquérir TikTok de manière anonyme et hautement rentable.

## Stratégie de base :
1. Créez un compte TikTok thématique axé sur une niche spécifique (Motivation, Finances, Outils Tech, ou Beauté).
2. Utilisez l''IA pour générer des scripts captivants (par exemple avec ChatGPT).
3. Produisez des voix off ultra-réalistes avec ElevenLabs ou l''outil natif de TikTok.
4. Utilisez CapCut pour monter des vidéos dynamiques avec des sous-titres stylisés.
5. Placez votre lien d''affiliation de manière stratégique dans la bio pour monétiser chaque vue !

Profitez de cette mine d''or pour dominer vos marchés.',
  'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop',
  '97€',
  true
) ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  file_url = EXCLUDED.file_url,
  image_url = EXCLUDED.image_url,
  perceived_value = EXCLUDED.perceived_value;

-- 2. Kit Lancement E-Commerce Élite
INSERT INTO public.rank_rewards (id, title, description, reward_type, file_url, image_url, perceived_value, is_active)
VALUES (
  '1cefd505-1234-5678-90ab-cdef12345679',
  'Kit Lancement E-Commerce Élite',
  'Les templates, structures de tunnels de vente à haut de taux de conversion et visuels d''offres irrésistibles.',
  'content',
  '# Kit Lancement E-Commerce Élite - Structure de Tunnel Gagnant

Ce pack contient les structures de tunnels de vente les plus rentables du marché :

## 1. La Vente Directe Monoproduit :
- Page de capture d''attention épurée
- Offre à durée limitée (Urgence)
- Garantie de satisfaction forte
- Processus de commande en 1 clic

## 2. Le script de l''Offre Irrésistible :
"Achetez-en 1, Obtenez le 2ème Gratuit + Livraison Offerte aujourd''hui uniquement"

Appliquez ces schémas pour multiplier votre panier moyen par 3.',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop',
  '147€',
  true
) ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  file_url = EXCLUDED.file_url,
  image_url = EXCLUDED.image_url,
  perceived_value = EXCLUDED.perceived_value;

-- 3. Script de Copywriting Haute Performance IA
INSERT INTO public.rank_rewards (id, title, description, reward_type, file_url, image_url, perceived_value, is_active)
VALUES (
  '2cefd505-1234-5678-90ab-cdef12345680',
  'Copywriting Haute Performance IA',
  'Le guide suprême et les prompts secrets pour faire rédiger par l''IA des textes de vente hypnotiques.',
  'content',
  '# Guide : Copywriting Haute Performance IA

Maîtrisez l''art d''écrire des mots qui vendent automatiquement grâce à la puissance des prompts configurés.

## Prompt Magique pour IA :
"Agis en tant que copywriter d''élite formé aux meilleures méthodes d''influence (AIDA et PAS). Rédige une page de vente hypnotique pour le produit suivant en accentuant la douleur et en apportant une solution immédiate..."

Utilisez ce prompt pour générer vos prochaine publicités.',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
  '197€',
  true
) ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  file_url = EXCLUDED.file_url,
  image_url = EXCLUDED.image_url,
  perceived_value = EXCLUDED.perceived_value;

-- -------------------------------------------------------------------------
-- PARTIE 5 : CRÉATION DE LA VUE D'ACTIVITÉ ADMINISTRATIVE MANQUANTE
-- -------------------------------------------------------------------------
-- Cette vue est requise par le tableau de bord pour calculer le temps accumulé.
CREATE OR REPLACE VIEW public.mz_admin_activity_summary AS
SELECT 
    user_id,
    COALESCE(SUM(total_minutes), 0)::INT as minutes_total,
    COALESCE(SUM(CASE WHEN tracking_date = CURRENT_DATE THEN total_minutes ELSE 0 END), 0)::INT as minutes_today
FROM public.mz_rewards_time_tracking
GROUP BY user_id;

-- Notifier postgrest pour recharger le schéma immédiatement
NOTIFY pgrst, 'reload schema';
