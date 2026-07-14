-- Migration pour associer l'Offre Flash MZ+ Premium à un produit de votre boutique Chariow
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase

ALTER TABLE public.mz_flash_offer_v2 
ADD COLUMN IF NOT EXISTS chariow_product_id VARCHAR(255);

-- Ajouter un commentaire explicatif sur la colonne
COMMENT ON COLUMN public.mz_flash_offer_v2.chariow_product_id IS 'ID de correspondance du produit Chariow associé à l''offre flash d''abonnement';
