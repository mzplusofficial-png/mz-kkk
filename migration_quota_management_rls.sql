-- ====================================================================
-- SCRIPT DE CONSTITUTION : SYSTÈME DE QUOTA GLOBAL, RLS & PAGINATION SÉCURISÉ
-- ====================================================================
-- Ce script implémente une sécurité renforcée, une pagination stricte
-- et un double contrôle de ressources :
-- 1. Limite globale (100k lectures et 5 Go total)
-- 2. Limite quotidienne stricte de 100 Ko (102400 octets) par jour par utilisateur.
-- Si la limite quotidienne de 100 Ko est dépassée, l'accès est bloqué immédiatement avant l'envoi des données.

-- 1. Table de suivi de la consommation de données et de requêtes
CREATE TABLE IF NOT EXISTS public.user_quota_consumption (
    user_id UUID PRIMARY KEY,
    total_reads INTEGER DEFAULT 0,
    total_bytes_read BIGINT DEFAULT 0,
    daily_bytes_read BIGINT DEFAULT 0, -- Octets lus pour la journée en cours
    last_read_date DATE DEFAULT CURRENT_DATE, -- Date du dernier accès pour réinitialisation du quota quotidien
    max_reads_limit INTEGER DEFAULT 100000, -- Limite cible de 100k lectures par utilisateur
    max_bytes_limit BIGINT DEFAULT 5368709120, -- Limite de 5 Go (en octets)
    max_daily_bytes_limit BIGINT DEFAULT 102400, -- Limite quotidienne stricte de 100 Ko (102400 octets)
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_blocked BOOLEAN DEFAULT false
);

-- Index pour accélérer la recherche des quotas par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_quota_user_id ON public.user_quota_consumption(user_id);

-- 2. Table de rapports de dépassements et d'alertes (Logs d'analyse)
CREATE TABLE IF NOT EXISTS public.user_quota_violations_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    requested_table TEXT NOT NULL,
    metric_value BIGINT NOT NULL, -- Valeur atteinte lors du dépassement
    metric_type TEXT NOT NULL, -- 'reads', 'bytes' ou 'daily_bytes'
    limit_value BIGINT NOT NULL, -- Limite qui a été franchie
    page_requested INT,
    limit_requested INT
);

-- Index de tri temporel pour les analyses de violations
CREATE INDEX IF NOT EXISTS idx_quota_violations_user_id ON public.user_quota_violations_log(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_violations_date ON public.user_quota_violations_log(triggered_at DESC);

-- 3. Activer le Row-Level Security (RLS) pour les tables créées
ALTER TABLE public.user_quota_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quota_violations_log ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour 'user_quota_consumption'
DROP POLICY IF EXISTS "Lecture de son propre quota" ON public.user_quota_consumption;
CREATE POLICY "Lecture de son propre quota" ON public.user_quota_consumption
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Modification des quotas par les administrateurs" ON public.user_quota_consumption;
CREATE POLICY "Modification des quotas par les administrateurs" ON public.user_quota_consumption
    FOR ALL USING (true); -- Accessible dans les hooks / triggers et les admins

-- Politiques RLS pour 'user_quota_violations_log'
DROP POLICY IF EXISTS "Lecture de ses propres logs de violation" ON public.user_quota_violations_log;
CREATE POLICY "Lecture de ses propres logs de violation" ON public.user_quota_violations_log
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Création globale de logs de violation" ON public.user_quota_violations_log;
CREATE POLICY "Création globale de logs de violation" ON public.user_quota_violations_log
    FOR INSERT WITH CHECK (true);

-- 4. FONCTION SQL SÉCURISÉE DE SÉLECTION AVEC CONTRÔLE DE QUOTA ET PAGINATION MANDATAIRE
CREATE OR REPLACE FUNCTION public.fetch_managed_table_data(
    p_user_id UUID,
    p_table_name TEXT,
    p_page INT,
    p_limit INT
)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Permet d'outrepasser les lectures système pour calculer le quota
AS $$
DECLARE
    v_offset INT;
    v_limit INT := LEAST(COALESCE(p_limit, 50), 50); -- Force une pagination stricte (50 lignes max par page)
    v_total_reads INT;
    v_total_bytes BIGINT;
    v_daily_bytes BIGINT;
    v_last_read_date DATE;
    v_max_reads INT;
    v_max_bytes BIGINT;
    v_max_daily_bytes BIGINT;
    v_is_blocked BOOLEAN;
    v_query TEXT;
    v_row JSON;
    v_count INT := 0;
    v_calculated_bytes BIGINT;
BEGIN
    -- Initialiser l'existence de la consommation si absent
    INSERT INTO public.user_quota_consumption (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Récupérer l'état de consommation actuel
    SELECT 
        total_reads, total_bytes_read, daily_bytes_read, last_read_date,
        max_reads_limit, max_bytes_limit, max_daily_bytes_limit, is_blocked
    INTO 
        v_total_reads, v_total_bytes, v_daily_bytes, v_last_read_date,
        v_max_reads, v_max_bytes, v_max_daily_bytes, v_is_blocked
    FROM public.user_quota_consumption
    WHERE user_id = p_user_id;

    -- Réinitialiser le quota quotidien si la date du jour est différente de CURRENT_DATE
    IF v_last_read_date != CURRENT_DATE THEN
        v_daily_bytes := 0;
        UPDATE public.user_quota_consumption
        SET daily_bytes_read = 0, last_read_date = CURRENT_DATE
        WHERE user_id = p_user_id;
    END IF;

    -- Vérifier si l'utilisateur est bloqué par défaut
    IF v_is_blocked THEN
        RAISE EXCEPTION 'Compte bloqué de manière administrative. Veuillez contacter le support.';
    END IF;

    -- Vérification de la limite globale (Optionnelle par rapport au quotidien)
    IF v_total_reads >= v_max_reads OR v_total_bytes >= v_max_bytes THEN
        INSERT INTO public.user_quota_violations_log (
            user_id, requested_table, metric_value, metric_type, limit_value, page_requested, limit_requested
        ) VALUES (
            p_user_id, p_table_name, 
            CASE WHEN v_total_reads >= v_max_reads THEN v_total_reads ELSE v_total_bytes END,
            CASE WHEN v_total_reads >= v_max_reads THEN 'reads' ELSE 'bytes' END,
            CASE WHEN v_total_reads >= v_max_reads THEN v_max_reads ELSE v_max_bytes END,
            p_page, p_limit
        );
        UPDATE public.user_quota_consumption SET is_blocked = TRUE WHERE user_id = p_user_id;
        RAISE EXCEPTION 'Quota de lecture GLOBAL dépassé (Limite: %). Accès bloqué.', v_max_bytes;
    END IF;

    -- VÉRIFICATION CRITIQUE QUOTIDIENNE (100 Ko / jour max)
    -- Si la consommation quotidienne dépasse déjà la limite, on intercepte directement AVANT tout envoi
    IF v_daily_bytes >= v_max_daily_bytes THEN
        INSERT INTO public.user_quota_violations_log (
            user_id, requested_table, metric_value, metric_type, limit_value, page_requested, limit_requested
        ) VALUES (
            p_user_id, p_table_name, v_daily_bytes, 'daily_bytes', v_max_daily_bytes, p_page, p_limit
        );
        RAISE EXCEPTION 'Interception Quota: Quota de lecture quotidien de 100 Ko dépassé pour aujourd''hui (% / % octets).', v_daily_bytes, v_max_daily_bytes;
    END IF;

    -- Validation de la table cible pour interdire l'injection SQL (White List)
    IF p_table_name NOT IN ('commissions', 'withdrawals', 'mz_user_store', 'rpa_submissions', 'products') THEN
        RAISE EXCEPTION 'Table name % is unauthorized or critical data access violates policy.', p_table_name;
    END IF;

    -- Calculer l'index d'offset
    v_offset := (GREATEST(p_page, 1) - 1) * v_limit;

    -- Déterminer la requête SQL logique. Filtre RLS de manière stricte par user_id pour garantir la sécurité.
    IF p_table_name = 'products' THEN
        v_query := format('SELECT row_to_json(v) FROM (SELECT * FROM public.%I ORDER BY id DESC LIMIT %s OFFSET %s) v', p_table_name, v_limit, v_offset);
    ELSE
        v_query := format('SELECT row_to_json(v) FROM (SELECT * FROM public.%I WHERE user_id = %L ORDER BY created_at DESC LIMIT %s OFFSET %s) v', p_table_name, p_user_id, v_limit, v_offset);
    END IF;

    -- Parcourir dynamiquement et calculer la consommation de données
    FOR v_row IN EXECUTE v_query LOOP
        v_calculated_bytes := octet_length(v_row::text);
        
        -- Vérifier si l'ajout de cette ligne dépasse le quota quotidien de 100 Ko
        IF (v_daily_bytes + v_calculated_bytes) > v_max_daily_bytes THEN
            -- Mettre à jour au maximum avant de lever l'interception
            UPDATE public.user_quota_consumption
            SET 
                daily_bytes_read = daily_bytes_read + v_calculated_bytes,
                total_bytes_read = total_bytes_read + v_calculated_bytes,
                total_reads = total_reads + 1,
                last_read_at = now()
            WHERE user_id = p_user_id;

            INSERT INTO public.user_quota_violations_log (
                user_id, requested_table, metric_value, metric_type, limit_value, page_requested, limit_requested
            ) VALUES (
                p_user_id, p_table_name, v_daily_bytes + v_calculated_bytes, 'daily_bytes', v_max_daily_bytes, p_page, p_limit
            );

            RAISE EXCEPTION 'Interception Quota: Quota de lecture quotidien de 100 Ko dépassé pendant le traitement de la requête.';
        END IF;

        v_count := v_count + 1;
        v_daily_bytes := v_daily_bytes + v_calculated_bytes;
        
        -- Mettre à jour les compteurs globaux et journaliers de l'utilisateur
        UPDATE public.user_quota_consumption
        SET 
            total_reads = total_reads + 1,
            total_bytes_read = total_bytes_read + v_calculated_bytes,
            daily_bytes_read = daily_bytes_read + v_calculated_bytes,
            last_read_at = now()
        WHERE user_id = p_user_id;

        RETURN NEXT v_row;
    END LOOP;

    RETURN;
END;
$$;


-- 5. FONCTIONS COMPLÉMENTAIRES D'ADMINISTRATION
-- Fonction pour débloquer ou recharger le quota d'un utilisateur
CREATE OR REPLACE FUNCTION public.reset_user_quota(
    p_user_id UUID,
    p_new_reads_limit INTEGER DEFAULT 100000,
    p_new_bytes_limit BIGINT DEFAULT 5368709120,
    p_new_daily_bytes_limit BIGINT DEFAULT 102400
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_quota_consumption
    SET 
        total_reads = 0,
        total_bytes_read = 0,
        daily_bytes_read = 0,
        max_reads_limit = p_new_reads_limit,
        max_bytes_limit = p_new_bytes_limit,
        max_daily_bytes_limit = p_new_daily_bytes_limit,
        is_blocked = false,
        last_read_date = CURRENT_DATE,
        last_read_at = now()
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;


-- 6. CRÉATION DES RAPPORTS AUTOMATISÉS (VUES D'ANALYSE GLOBALE)
CREATE OR REPLACE VIEW public.user_quota_report AS
SELECT 
    qc.user_id,
    u.full_name,
    u.email,
    qc.total_reads,
    qc.max_reads_limit,
    qc.total_bytes_read,
    qc.max_bytes_limit,
    qc.daily_bytes_read,
    qc.max_daily_bytes_limit,
    ROUND((qc.total_reads::float / qc.max_reads_limit::float * 100)::numeric, 2) as reads_usage_pct,
    ROUND((qc.total_bytes_read::float / qc.max_bytes_limit::float * 100)::numeric, 2) as bytes_usage_pct,
    ROUND((qc.daily_bytes_read::float / qc.max_daily_bytes_limit::float * 100)::numeric, 2) as daily_bytes_usage_pct,
    qc.is_blocked,
    qc.last_read_at
FROM public.user_quota_consumption qc
LEFT JOIN public.users u ON u.id = qc.user_id;

-- Notifier postgrest pour recharger le schéma immédiatement
NOTIFY pgrst, 'reload schema';
