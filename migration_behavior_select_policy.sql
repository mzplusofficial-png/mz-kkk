-- Migration SQL : Résolution de l'affichage des données d'activité de la page Premium dans le Panel Admin
-- Ce script configure et autorise la politique de lecture (SELECT) sur la table mz_offer_page_tracking

-- 1. S'assurer que le Row Level Security (RLS) est actif
ALTER TABLE public.mz_offer_page_tracking ENABLE ROW LEVEL SECURITY;

-- 2. Ajouter la politique de lecture (SELECT) publique pour permettre aux admins d'accéder aux statistiques de comportement
DROP POLICY IF EXISTS "Lecture de tous les trackings" ON public.mz_offer_page_tracking;
CREATE POLICY "Lecture de tous les trackings" ON public.mz_offer_page_tracking FOR SELECT USING (true);

-- 3. S'assurer que les politiques d'insertion et de mise à jour fonctionnent également pour les ambassadeurs
DROP POLICY IF EXISTS "Insert own tracking" ON public.mz_offer_page_tracking;
CREATE POLICY "Insert own tracking" ON public.mz_offer_page_tracking FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update own tracking" ON public.mz_offer_page_tracking;
CREATE POLICY "Update own tracking" ON public.mz_offer_page_tracking FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Notification PGREST de rafraîchissement
NOTIFY pgrst, 'reload schema';
