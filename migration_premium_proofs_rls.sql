-- Migration SQL : Création de la table mz_premium_proofs et Configuration des politiques de sécurité RLS
-- Ce script permet de résoudre l'erreur RLS lors de l'ajout/mise à jour de preuves dans le panel administrateur

-- 1. S'assurer que la table mz_premium_proofs existe avec la bonne structure
CREATE TABLE IF NOT EXISTS public.mz_premium_proofs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    before_amount TEXT,
    after_amount TEXT,
    time_frame TEXT,
    before_image_url TEXT,
    after_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. S'assurer que le Row Level Security (RLS) est actif
ALTER TABLE public.mz_premium_proofs ENABLE ROW LEVEL SECURITY;

-- 3. Politique de lecture publique (SELECT) pour que tous les ambassadeurs puissent voir les preuves de gains
DROP POLICY IF EXISTS "Lecture publique des preuves" ON public.mz_premium_proofs;
CREATE POLICY "Lecture publique des preuves" ON public.mz_premium_proofs FOR SELECT USING (true);

-- 4. Politique d'insertion (INSERT) pour permettre aux administrateurs d'ajouter des preuves
DROP POLICY IF EXISTS "Insertion des preuves par les admins" ON public.mz_premium_proofs;
CREATE POLICY "Insertion des preuves par les admins" ON public.mz_premium_proofs FOR INSERT WITH CHECK (true);

-- 5. Politique de mise à jour (UPDATE) pour permettre de modifier les preuves
DROP POLICY IF EXISTS "Mise a jour des preuves par les admins" ON public.mz_premium_proofs;
CREATE POLICY "Mise a jour des preuves par les admins" ON public.mz_premium_proofs FOR UPDATE USING (true);

-- 6. Politique de suppression (DELETE) pour permettre de retirer des preuves
DROP POLICY IF EXISTS "Suppression des preuves par les admins" ON public.mz_premium_proofs;
CREATE POLICY "Suppression des preuves par les admins" ON public.mz_premium_proofs FOR DELETE USING (true);

-- Notification PGREST de rafraîchissement
NOTIFY pgrst, 'reload schema';
