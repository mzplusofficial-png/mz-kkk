-- ====================================================================
-- SCRIPT DE CRÉATION DU SYSTÈME DU CHALLENGE DE 3 JOURS & DES NOTIFICATIONS
-- ====================================================================
-- Ce script configure toutes les tables nécessaires au bon fonctionnement :
--  1. Du Challenge de 3 Jours (mz_challenge_3j_state)
--  2. Des Notifications In-App (internal_notifications)
--  3. Des Notifications Push d'Administration Globale (admin_push_notifications)
--  4. Du Suivi de Lecture des Notifications Push (admin_push_receipts)
--  5. De la Synchronisation FCM sur les Utilisateurs (tables public.users)
--
-- DIRECTIVES :
-- Copiez-collez l'intégralité de ce code dans l'éditeur SQL Supabase puis exécutez-le.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TABLE : mz_challenge_3j_state (État du Challenge de 3 Jours)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mz_challenge_3j_state (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    presented BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    j1_completed BOOLEAN DEFAULT false,
    j2_presented BOOLEAN DEFAULT false,
    j2_started_at TIMESTAMP WITH TIME ZONE,
    j2_completed BOOLEAN DEFAULT false,
    j2_completed_at TIMESTAMP WITH TIME ZONE,
    j3_presented BOOLEAN DEFAULT false,
    j3_started_at TIMESTAMP WITH TIME ZONE,
    j3_completed BOOLEAN DEFAULT false,
    cancelled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activation de la Sécurité Ligne par Ligne (RLS)
ALTER TABLE public.mz_challenge_3j_state ENABLE ROW LEVEL SECURITY;

-- Politiques RLS du challenge
DROP POLICY IF EXISTS "Users can read own challenge state" ON public.mz_challenge_3j_state;
CREATE POLICY "Users can read own challenge state" 
ON public.mz_challenge_3j_state FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own challenge state" ON public.mz_challenge_3j_state;
CREATE POLICY "Users can update own challenge state" 
ON public.mz_challenge_3j_state FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own challenge state" ON public.mz_challenge_3j_state;
CREATE POLICY "Users can insert own challenge state" 
ON public.mz_challenge_3j_state FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin access" ON public.mz_challenge_3j_state;
CREATE POLICY "Admin access" 
ON public.mz_challenge_3j_state FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND (users.is_admin = true OR users.admin_role IS NOT NULL)
    )
);


-- --------------------------------------------------------------------
-- 2. TABLE : internal_notifications (Notifications In-App Temps Réel)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'evolution_reaction' | 'challenge' | 'commission' | 'admin_alert' | etc.
    title TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- S'assurer que les colonnes additionnelles modernes existent
ALTER TABLE public.internal_notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.internal_notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.internal_notifications ALTER COLUMN sender_id DROP NOT NULL;

-- Activation RLS et Politiques
ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture des notifications personnelles" ON public.internal_notifications;
CREATE POLICY "Lecture des notifications personnelles" 
ON public.internal_notifications FOR SELECT 
USING (auth.uid() = recipient_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Création universelle de notification" ON public.internal_notifications;
CREATE POLICY "Création universelle de notification" 
ON public.internal_notifications FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Mise à jour de ses propres notifications" ON public.internal_notifications;
CREATE POLICY "Mise à jour de ses propres notifications" 
ON public.internal_notifications FOR UPDATE 
USING (auth.uid() = recipient_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Suppression de ses propres notifications" ON public.internal_notifications;
CREATE POLICY "Suppression de ses propres notifications" 
ON public.internal_notifications FOR DELETE 
USING (auth.uid() = recipient_id OR auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_internal_notifications_recipient ON public.internal_notifications(recipient_id);


-- --------------------------------------------------------------------
-- 3. TABLE : admin_push_notifications (Publications d'alertes par les admins)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon_type TEXT DEFAULT 'info',
    url TEXT DEFAULT '/',
    target_type TEXT DEFAULT 'all', -- 'all' | 'level' | 'user'
    target_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- S'assurer que les colonnes sont synchronisées
ALTER TABLE public.admin_push_notifications ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '/';

-- RLS et Politiques
ALTER TABLE public.admin_push_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des alertes admin" ON public.admin_push_notifications;
CREATE POLICY "Lecture publique des alertes admin" 
ON public.admin_push_notifications FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Insertion par les admins uniquement" ON public.admin_push_notifications;
CREATE POLICY "Insertion par les admins uniquement" 
ON public.admin_push_notifications FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND (users.is_admin = true OR users.admin_role IS NOT NULL)
    )
);


-- --------------------------------------------------------------------
-- 4. TABLE : admin_push_receipts (Aperçu et état de lecture des alertes)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_push_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.admin_push_notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Une seule lecture par utilisateur et par alerte pour éviter les doublons
ALTER TABLE public.admin_push_receipts DROP CONSTRAINT IF EXISTS admin_push_receipts_user_notif_unique;
ALTER TABLE public.admin_push_receipts ADD CONSTRAINT admin_push_receipts_user_notif_unique UNIQUE (user_id, notification_id);

-- RLS et Politiques
ALTER TABLE public.admin_push_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture de ses propres reçus" ON public.admin_push_receipts;
CREATE POLICY "Lecture de ses propres reçus" 
ON public.admin_push_receipts FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Création de reçus par le destinataire" ON public.admin_push_receipts;
CREATE POLICY "Création de reçus par le destinataire" 
ON public.admin_push_receipts FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);


-- --------------------------------------------------------------------
-- 5. SYNCHRONISATION DES COLONNES UTILISATEURS POUR LES NOTIFICATIONS
-- --------------------------------------------------------------------
-- Ces colonnes reçoivent les tokens Firebase Cloud Messaging (FCM) 
-- des terminaux des utilisateurs afin de délivrer de vrais Pushs d'arrière plan.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_fcm_sync TIMESTAMP WITH TIME ZONE;

-- Index pour accélérer le ciblage lors des pushs globaux
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON public.users(fcm_token) WHERE fcm_token IS NOT NULL;
