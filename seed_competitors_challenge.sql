-- =========================================================================
-- SCRIPT DE SEEDING COMPLET : AJOUT DES AMBASSADEURS DU CLASSEMENT
-- AVEC LEURS CLICS (VISITES) ET VENTES POUR GARANTIR UNE LOGIQUE PARFAITE
-- =========================================================================
-- Instructions : Copiez-collez l'intégralité de ce script et exécutez-le
--               dans l'éditeur de requêtes SQL (SQL Editor) de Supabase.

-- 1. S'assurer que le produit témoin existe pour lier nos ventes et statistiques
INSERT INTO public.products (id, name, description, price, commission_amount, image_url, created_at)
VALUES (
  '33333333-3333-3333-3333-333333333333', 
  'Offre MZ+ Premium', 
  'Accès complet au système de parrainage et automatisations de ventes', 
  299.00, 
  100.00, 
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', 
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertion des 4 ambassadeurs réels simulés dans la table public.users
INSERT INTO public.users (
  id, 
  email, 
  full_name, 
  username, 
  country, 
  country_code, 
  rank_id, 
  rank_name, 
  created_at
)
VALUES 
  (
    'a1111111-2222-3333-4444-555555555555', 
    'issouf.kone@mzplus-ambassador.com', 
    'Issouf Koné', 
    'issouf_kone', 
    'Côte d''Ivoire', 
    '🇨🇮 Côte d''Ivoire', 
    1, 
    'DÉBUTANT', 
    now() - interval '2 days'
  ),
  (
    'b2222222-3333-4444-5555-666666666666', 
    'aminata.diallo@mzplus-ambassador.com', 
    'Aminata Diallo', 
    'aminata_diallo', 
    'Sénégal', 
    '🇸🇳 Sénégal', 
    1, 
    'DÉBUTANT', 
    now() - interval '3 days'
  ),
  (
    'c3333333-4444-5555-6666-777777777777', 
    'marc.yao@mzplus-ambassador.com', 
    'Marc Yao', 
    'marc_yao', 
    'Cameroun', 
    '🇨🇲 Cameroun', 
    1, 
    'DÉBUTANT', 
    now() - interval '4 days'
  ),
  (
    'd4444444-5555-6666-7777-888888888888',
    'dimitri.some@mzplus-ambassador.com',
    'Dimitri Somé',
    'dimitri_some',
    'Burkina Faso',
    '🇧🇫 Burkina Faso',
    1,
    'DÉBUTANT',
    now() - interval '5 days'
  )
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  country_code = EXCLUDED.country_code,
  country = EXCLUDED.country;

-- 3. Insertion des statistiques de clics (visites) réelles pour être logique avec les ventes !
-- Issouf Koné : 20 clics
-- Aminata Diallo : 400 clics
-- Marc Yao : 300 clics
-- Dimitri Somé : 45 clics
INSERT INTO public.product_stats (user_id, product_id, clicks)
VALUES
  ('a1111111-2222-3333-4444-555555555555', '33333333-3333-3333-3333-333333333333', 20),
  ('b2222222-3333-4444-5555-666666666666', '33333333-3333-3333-3333-333333333333', 400),
  ('c3333333-4444-5555-6666-777777777777', '33333333-3333-3333-3333-333333333333', 300),
  ('d4444444-5555-6666-7777-888888888888', '33333333-3333-3333-3333-333333333333', 45)
ON CONFLICT (user_id, product_id) DO UPDATE SET clicks = EXCLUDED.clicks;

-- 4. Insertion des commissions validées de 5 000 FCFA
-- Issouf Koné : 1 vente (1 commission)
-- Aminata Diallo : 3 ventes (3 commissions distinctes)
-- Marc Yao : 1 vente (1 commission)
-- Dimitri Somé : 0 vente
INSERT INTO public.commissions (
  id, 
  user_id, 
  product_id,
  amount, 
  status, 
  created_at
)
VALUES
  (
    'aa111111-aaaa-bbbb-cccc-dddddddddddd', 
    'a1111111-2222-3333-4444-555555555555', 
    '33333333-3333-3333-3333-333333333333',
    5000.00, 
    'approved', 
    now() - interval '36 hours'
  ),
  (
    'bb222222-aaaa-bbbb-cccc-111111111111', 
    'b2222222-3333-4444-5555-666666666666', 
    '33333333-3333-3333-3333-333333333333',
    5000.00, 
    'approved', 
    now() - interval '48 hours'
  ),
  (
    'bb222222-aaaa-bbbb-cccc-222222222222', 
    'b2222222-3333-4444-5555-666666666666', 
    '33333333-3333-3333-3333-333333333333',
    5000.00, 
    'approved', 
    now() - interval '46 hours'
  ),
  (
    'bb222222-aaaa-bbbb-cccc-333333333333', 
    'b2222222-3333-4444-5555-666666666666', 
    '33333333-3333-3333-3333-333333333333',
    5000.00, 
    'approved', 
    now() - interval '44 hours'
  ),
  (
    'cc333333-aaaa-bbbb-cccc-dddddddddddd', 
    'c3333333-4444-5555-6666-777777777777', 
    '33333333-3333-3333-3333-333333333333',
    5000.00, 
    'approved', 
    now() - interval '60 hours'
  )
ON CONFLICT (id) DO NOTHING;
