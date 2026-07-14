-- Migration pour ajouter le champ "theme" aux produits
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS theme VARCHAR(255);

-- Ajouter un commentaire explicatif sur la colonne
COMMENT ON COLUMN public.products.theme IS 'Thématique du livre ou service (developpement_personnel, business_finance, sante)';
