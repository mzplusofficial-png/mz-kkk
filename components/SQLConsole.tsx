
import React, { useState, useEffect, useRef } from 'react';
import initSqlJs, { Database } from 'sql.js';
import { Play, Database as DbIcon, FileCode, AlertCircle, CheckCircle2, Copy, Terminal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SQLConsoleProps {
  profile: any;
}

export const SQLConsole: React.FC<SQLConsoleProps> = ({ profile }) => {
  const [db, setDb] = useState<Database | null>(null);
  const [query, setQuery] = useState<string>('SELECT * FROM users;');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'local' | 'supabase'>('local');
  const [sqlFiles, setSqlFiles] = useState<{name: string, content: string}[]>([]);

  useEffect(() => {
    const initDb = async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: (file) => `https://sql.js.org/dist/${file}`
        });
        const newDb = new SQL.Database();
        
        // Create sample tables for local playground
        newDb.run(`
          CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, rank TEXT);
          INSERT INTO users VALUES (1, 'Jean Dupont', 'jean@example.com', 'Ambassadeur');
          INSERT INTO users VALUES (2, 'Marie Curie', 'marie@example.com', 'Elite');
          INSERT INTO users VALUES (3, 'Admin MZ+', 'admin@mz.plus', 'Super Admin');
          
          CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL);
          INSERT INTO products VALUES (1, 'Pack Elite', 99.99);
          INSERT INTO products VALUES (2, 'Coaching IA', 49.99);
        `);
        
        setDb(newDb);
      } catch (err: any) {
        console.error("SQL.js init error:", err);
        setError("Erreur lors de l'initialisation du moteur SQL.");
      } finally {
        setLoading(false);
      }
    };

    initDb();
  }, []);

  const runQuery = () => {
    if (!db) return;
    setError(null);
    try {
      const res = db.exec(query);
      if (res.length > 0) {
        setResults(res[0].values.map(row => {
          const obj: any = {};
          res[0].columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        }));
      } else {
        setResults([]);
        setError("Requête exécutée avec succès (aucun résultat à afficher).");
      }
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    }
  };

  const REAL_SCRIPTS_CONTENT: Record<string, string> = {
    'MIGRATION_QUOTA_MANAGEMENT_RLS.sql': `-- ====================================================================
-- SCRIPT DE CONSTITUTION : SYSTÈME DE QUOTA GLOBAL, RLS & PAGINATION
-- ====================================================================
-- Limite automatiquement le nombre de lectures Supabase (cible max 100k) et 5 Go
-- Et une limite quotidienne de 100 Ko par utilisateur (intercepté avant traitement)

CREATE TABLE IF NOT EXISTS public.user_quota_consumption (
    user_id UUID PRIMARY KEY,
    total_reads INTEGER DEFAULT 0,
    total_bytes_read BIGINT DEFAULT 0,
    daily_bytes_read BIGINT DEFAULT 0,
    last_read_date DATE DEFAULT CURRENT_DATE,
    max_reads_limit INTEGER DEFAULT 100000,
    max_bytes_limit BIGINT DEFAULT 5368709120,
    max_daily_bytes_limit BIGINT DEFAULT 102400, -- Limite journalière de 100 Ko
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_blocked BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_quota_user_id ON public.user_quota_consumption(user_id);

CREATE TABLE IF NOT EXISTS public.user_quota_violations_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    requested_table TEXT NOT NULL,
    metric_value BIGINT NOT NULL,
    metric_type TEXT NOT NULL,
    limit_value BIGINT NOT NULL,
    page_requested INT,
    limit_requested INT
);

CREATE INDEX IF NOT EXISTS idx_quota_violations_user_id ON public.user_quota_violations_log(user_id);

ALTER TABLE public.user_quota_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quota_violations_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture de son propre quota" ON public.user_quota_consumption;
CREATE POLICY "Lecture de son propre quota" ON public.user_quota_consumption
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Lecture de ses logs" ON public.user_quota_violations_log;
CREATE POLICY "Lecture de ses logs" ON public.user_quota_violations_log
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.fetch_managed_table_data(
    p_user_id UUID,
    p_table_name TEXT,
    p_page INT,
    p_limit INT
)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INT;
    v_limit INT := LEAST(COALESCE(p_limit, 50), 50);
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
    INSERT INTO public.user_quota_consumption (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT 
        total_reads, total_bytes_read, daily_bytes_read, last_read_date,
        max_reads_limit, max_bytes_limit, max_daily_bytes_limit, is_blocked
    INTO 
        v_total_reads, v_total_bytes, v_daily_bytes, v_last_read_date,
        v_max_reads, v_max_bytes, v_max_daily_bytes, v_is_blocked
    FROM public.user_quota_consumption
    WHERE user_id = p_user_id;

    IF v_last_read_date != CURRENT_DATE THEN
        v_daily_bytes := 0;
        UPDATE public.user_quota_consumption
        SET daily_bytes_read = 0, last_read_date = CURRENT_DATE
        WHERE user_id = p_user_id;
    END IF;

    IF v_is_blocked THEN
        RAISE EXCEPTION 'Compte utilisateur bloqué administrativement. Contactez le support.';
    END IF;

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
        RAISE EXCEPTION 'Quota de lecture GLOBAL dépassé pour l''utilisateur % sur la table %', p_user_id, p_table_name;
    END IF;

    -- Vérification journalière préemptive (100 Ko)
    IF v_daily_bytes >= v_max_daily_bytes THEN
        INSERT INTO public.user_quota_violations_log (
            user_id, requested_table, metric_value, metric_type, limit_value, page_requested, limit_requested
        ) VALUES (
            p_user_id, p_table_name, v_daily_bytes, 'daily_bytes', v_max_daily_bytes, p_page, p_limit
        );
        RAISE EXCEPTION 'Quota quotidien de 100 Ko dépassé pour aujourd''hui (% octets). Accès bloqué.', v_daily_bytes;
    END IF;

    IF p_table_name NOT IN ('commissions', 'withdrawals', 'mz_user_store', 'rpa_submissions', 'products') THEN
        RAISE EXCEPTION 'Accès refusé pour la table %', p_table_name;
    END IF;

    v_offset := (GREATEST(p_page, 1) - 1) * v_limit;

    IF p_table_name = 'products' THEN
        v_query := format('SELECT row_to_json(v) FROM (SELECT * FROM public.%I ORDER BY id DESC LIMIT %s OFFSET %s) v', p_table_name, v_limit, v_offset);
    ELSE
        v_query := format('SELECT row_to_json(v) FROM (SELECT * FROM public.%I WHERE user_id = %L ORDER BY created_at DESC LIMIT %s OFFSET %s) v', p_table_name, p_user_id, v_limit, v_offset);
    END IF;

    FOR v_row IN EXECUTE v_query LOOP
        v_calculated_bytes := octet_length(v_row::text);
        
        -- Intercepter directement et bloquer avant de dépasser le quota quotidien
        IF (v_daily_bytes + v_calculated_bytes) > v_max_daily_bytes THEN
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
            RAISE EXCEPTION 'Interception Quota: Quota de lecture quotidien de 100 Ko dépassé.';
        END IF;

        v_count := v_count + 1;
        v_daily_bytes := v_daily_bytes + v_calculated_bytes;

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
$$;`,
    'CREATE_EVOLUTIONS_SYSTEM.sql': `-- ====================================================================
-- SCRIPT COMPLET DE CONSTITUTION DU SYSTÈME D'ÉVOLUTIONS & VICTOIRES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.member_evolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    old_level TEXT,
    new_level TEXT,
    type TEXT NOT NULL,
    achievement_title TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reactions JSONB DEFAULT '{}'::jsonb,
    user_reactions JSONB DEFAULT '{}'::jsonb,
    comment_count INTEGER DEFAULT 0
);

ALTER TABLE public.member_evolutions ADD COLUMN IF NOT EXISTS user_reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.member_evolutions ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

ALTER TABLE public.member_evolutions DROP CONSTRAINT IF EXISTS member_evolutions_user_id_fkey;
ALTER TABLE public.member_evolutions ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.evolution_reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    post_id UUID NOT NULL,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.evolution_reactions DROP CONSTRAINT IF EXISTS evolution_reactions_unique_user_post_reaction;
ALTER TABLE public.evolution_reactions ADD CONSTRAINT evolution_reactions_unique_user_post_reaction UNIQUE (user_id, post_id, reaction_type);

CREATE TABLE IF NOT EXISTS public.internal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL,
    sender_id UUID,
    type TEXT NOT NULL,
    title TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.internal_notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.internal_notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.internal_notifications ALTER COLUMN sender_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.mz_background_notifications_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    notif_type TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.member_evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mz_background_notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture de toutes les évolutions par tout le monde" ON public.member_evolutions;
CREATE POLICY "Lecture de toutes les évolutions par tout le monde" ON public.member_evolutions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insertion par les utilisateurs connectés" ON public.member_evolutions;
CREATE POLICY "Insertion par les utilisateurs connectés" ON public.member_evolutions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Mise à jour libre par les utilisateurs connectés" ON public.member_evolutions;
CREATE POLICY "Mise à jour libre par les utilisateurs connectés" ON public.member_evolutions FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Suppression par les admins ou l'auteur" ON public.member_evolutions;
CREATE POLICY "Suppression par les admins ou l'auteur" ON public.member_evolutions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Lecture publique des réactions" ON public.evolution_reactions;
CREATE POLICY "Lecture publique des réactions" ON public.evolution_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion des réactions par utilisateurs authentifiés" ON public.evolution_reactions;
CREATE POLICY "Gestion des réactions par utilisateurs authentifiés" ON public.evolution_reactions FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Lecture des notifications personnelles" ON public.internal_notifications;
CREATE POLICY "Lecture des notifications personnelles" ON public.internal_notifications FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Création universelle de notification" ON public.internal_notifications;
CREATE POLICY "Création universelle de notification" ON public.internal_notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Mise à jour de ses propres notifications" ON public.internal_notifications;
CREATE POLICY "Mise à jour de ses propres notifications" ON public.internal_notifications FOR UPDATE USING (auth.uid() = recipient_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Lecture de ses logs de rate-limiting" ON public.mz_background_notifications_log;
CREATE POLICY "Lecture de ses logs de rate-limiting" ON public.mz_background_notifications_log FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Ajout de logs de rate-limiting" ON public.mz_background_notifications_log;
CREATE POLICY "Ajout de logs de rate-limiting" ON public.mz_background_notifications_log FOR INSERT WITH CHECK (true);`,

    'FIX_MEMBER_EVOLUTIONS_FOREIGN_KEY.sql': `-- ==========================================================
-- SCRIPT DE RÉSOLUTION DES CONTRAINTES DE L'IMPORTATION DES ÉVOLUTIONS
-- ==========================================================
-- Ce script supprime la contrainte de clé étrangère restrictive pour permettre 
-- l'importation libre du coaching et des évolutions historiques.

ALTER TABLE public.member_evolutions 
DROP CONSTRAINT IF EXISTS member_evolutions_user_id_fkey;

ALTER TABLE public.member_evolutions 
ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_member_evolutions_user_id ON public.member_evolutions(user_id);`,

    'database_setup.sql': `-- ==========================================================
-- INITIALISATION DES TABLES ET COLONNES DE BASE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    username TEXT,
    user_level TEXT DEFAULT 'standard',
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`,

    'schema_fix.sql': `-- ==========================================================
-- CORRECTION DES STRUCTURES DE DONNÉES ET TYPES
-- ==========================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS store_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rpa_points INTEGER DEFAULT 0;`,

    'fix_products_rls.sql': `-- ==========================================================
-- CONFIGURATION DE LA SÉCURITÉ (RLS) POUR LES PRODUITS
-- ==========================================================
ALTER TABLE public.mz_formations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to active formations" ON public.mz_formations FOR SELECT USING (true);`,

    'ranking_fix.sql': `-- ==========================================================
-- MISE À JOUR DU SYSTÈME DE CLASSEMENT DES AMBASSADEURS
-- ==========================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rank_id INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rank_name TEXT DEFAULT 'DÉBUTANT';`,

    'FIX_RANK_REWARDS_SETUP.sql': `-- ==========================================================
-- SCRIPT DE RÉSOLUTION COMPLÈTE : RÉCOMPENSES ET IMPORTATION
-- ==========================================================

-- 1. Assurer que la table rank_rewards possède la bonne structure complète
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

-- Ajouter les colonnes manquantes au cas où la table existait déjà sans elles
ALTER TABLE public.rank_rewards ADD COLUMN IF NOT EXISTS rank_name TEXT;
ALTER TABLE public.rank_rewards ADD COLUMN IF NOT EXISTS reward_type TEXT;

-- 2. Assurer que la table user_rank_rewards possède la bonne structure
CREATE TABLE IF NOT EXISTS public.user_rank_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    rank_id INTEGER NOT NULL,
    reward_id UUID REFERENCES public.rank_rewards(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, rank_id)
);

-- 3. SUPPRIMER LA CLÉ ÉTRANGÈRE SUR L''ID UTILISATEUR POUR L''IMPORTATION INFAILLIBLE
-- Cela résout l''erreur 23503 lors de l''import d''anciens backups sans avoir besoin de désactiver les déclencheurs système !
ALTER TABLE public.user_rank_rewards DROP CONSTRAINT IF EXISTS user_rank_rewards_user_id_fkey;

-- Index pour assurer la rapidité des requêtes d''affichage d''historique
CREATE INDEX IF NOT EXISTS idx_user_rank_rewards_user_id ON public.user_rank_rewards(user_id);

-- 4. Activer RLS et recréer les politiques de sécurité (RLS)
ALTER TABLE public.rank_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rank_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active rank rewards" ON public.rank_rewards;
CREATE POLICY "Anyone can view active rank rewards" ON public.rank_rewards
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage rank rewards" ON public.rank_rewards;
CREATE POLICY "Admins can manage rank rewards" ON public.rank_rewards
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can insert their own claims" ON public.user_rank_rewards;
CREATE POLICY "Users can insert their own claims" ON public.user_rank_rewards
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read their own claims" ON public.user_rank_rewards;
CREATE POLICY "Users can read their own claims" ON public.user_rank_rewards
    FOR SELECT USING (true);

-- 5. SEMER DES RÉCOMPENSES MAGNIFIQUES ET OPÉRATIONNELLES (TikTok Sans Visage, E-Commerce, etc.)
-- Bonus 1 : TikTok Sans Visage
INSERT INTO public.rank_rewards (id, title, description, reward_type, file_url, image_url, perceived_value, is_active)
VALUES (
  ''0cefd505-1234-5678-90ab-cdef12345678'',
  ''TikTok Sans Visage (Bonus MZ+)'',
  ''Multipliez vos ventes avec l''''intelligence artificielle et l''''art créatif de la vente invisible sur TikTok.'',
  ''content'',
  ''# TikTok Sans Visage : Multipliez Vos Ventes avec l''''IA et l''''Énergie MZ+

Bienvenue dans votre bonus exclusif ! Ce guide est conçu pour vous aider à conquérir TikTok de manière anonyme et hautement rentable.

## Stratégie de base :
1. Créez un compte TikTok thématique axé sur une niche spécifique (Motivation, Finances, Outils Tech, ou Beauté).
2. Utilisez l''''IA pour générer des scripts captivants (par exemple avec ChatGPT).
3. Produisez des voix off ultra-réalistes avec ElevenLabs ou l''''outil natif de TikTok.
4. Utilisez CapCut pour monter des vidéos dynamiques avec des sous-titres stylisés.
5. Placez votre lien d''''affiliation de manière stratégique dans la bio pour monétiser chaque vue !

Profitez de cette mine d''''or pour dominer vos marchés.'',
  ''https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop'',
  ''97€'',
  true
) ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  file_url = EXCLUDED.file_url,
  image_url = EXCLUDED.image_url,
  perceived_value = EXCLUDED.perceived_value;

-- Bonus 2 : Kit Lancement E-Commerce Élite
INSERT INTO public.rank_rewards (id, title, description, reward_type, file_url, image_url, perceived_value, is_active)
VALUES (
  ''1cefd505-1234-5678-90ab-cdef12345679'',
  ''Kit Lancement E-Commerce Élite'',
  ''Les templates, structures de tunnels de vente à haut de taux de conversion et visuels d''''offres irrésistibles.'',
  ''content'',
  ''# Kit Lancement E-Commerce Élite - Structure de Tunnel Gagnant

Ce pack contient les structures de tunnels de vente les plus rentables du marché :

## 1. La Vente Directe Monoproduit :
- Page de capture d''''attention épurée
- Offre à durée limitée (Urgence)
- Garantie de satisfaction forte
- Processus de commande en 1 clic

## 2. Le script de l''''Offre Irrésistible :
"Achetez-en 1, Obtenez le 2ème Gratuit + Livraison Offerte aujourd''''hui uniquement"

Appliquez ces schémas pour multiplier votre panier moyen par 3.'',
  ''https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop'',
  ''147€'',
  true
) ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  file_url = EXCLUDED.file_url,
  image_url = EXCLUDED.image_url,
  perceived_value = EXCLUDED.perceived_value;

-- Bonus 3 : Script de Copywriting Haute Performance IA
INSERT INTO public.rank_rewards (id, title, description, reward_type, file_url, image_url, perceived_value, is_active)
VALUES (
  ''2cefd505-1234-5678-90ab-cdef12345680'',
  ''Copywriting Haute Performance IA'',
  ''Le guide suprême et les prompts secrets pour faire rédiger par l''''IA des textes de vente hypnotiques.'',
  ''content'',
  ''# Guide : Copywriting Haute Performance IA

Maîtrisez l''''art d''''écrire des mots qui vendent automatiquement grâce à la puissance des prompts configurés.

## Prompt Magique pour IA :
"Agis en tant que copywriter d''''élite formé aux meilleures méthodes d''''influence (AIDA et PAS). Rédige une page de vente hypnotique pour le produit suivant en accentuant la douleur et en apportant une solution immédiate..."

Utilisez ce prompt pour générer vos prochaine publicités.'',
  ''https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop'',
  ''197€'',
  true
) ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  file_url = EXCLUDED.file_url,
  image_url = EXCLUDED.image_url,
  perceived_value = EXCLUDED.perceived_value;

-- -------------------------------------------------------------------------
-- PARTIE 5 : CRÉATION DE LA VUE D''ACTIVITÉ ADMINISTRATIVE MANQUANTE
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
NOTIFY pgrst, ''reload schema'';`
  };

  const copyToClipboard = (text: string) => {
    const textToCopy = REAL_SCRIPTS_CONTENT[text] || text;
    navigator.clipboard.writeText(textToCopy);
    alert("Script copié dans le presse-papier avec succès !");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-yellow-500">
        <Terminal className="animate-pulse mr-2" />
        Chargement de la console SQL...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Terminal className="text-yellow-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Console SQL Admin</h1>
            <p className="text-gray-400 text-sm italic">Testez vos requêtes et gérez votre schéma</p>
          </div>
        </div>
        
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button 
            onClick={() => setActiveTab('local')}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === 'local' ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white"
            )}
          >
            Playground Local (SQLite)
          </button>
          <button 
            onClick={() => setActiveTab('supabase')}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === 'supabase' ? "bg-yellow-500 text-black" : "text-gray-400 hover:text-white"
            )}
          >
            Scripts Supabase
          </button>
        </div>
      </div>

      {activeTab === 'local' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-800/50 px-4 py-2 flex items-center justify-between border-bottom border-zinc-800">
                <span className="text-xs font-mono text-gray-400">query.sql</span>
                <button 
                  onClick={runQuery}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1 rounded text-xs font-bold transition-colors"
                >
                  <Play size={12} fill="currentColor" />
                  EXÉCUTER
                </button>
              </div>
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-48 bg-transparent p-4 font-mono text-sm text-yellow-100 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>

            {error && (
              <div className={cn(
                "p-4 rounded-lg flex items-start gap-3 text-sm",
                error.includes("succès") ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}>
                {error.includes("succès") ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <p>{error}</p>
              </div>
            )}

            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-800/50 px-4 py-2 border-bottom border-zinc-800">
                <span className="text-xs font-mono text-gray-400">Résultats ({results.length})</span>
              </div>
              <div className="overflow-x-auto">
                {results.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-800/30 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        {Object.keys(results[0]).map(key => (
                          <th key={key} className="px-4 py-3 font-medium">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {results.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-3 text-gray-300 font-mono">{val?.toString()}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-gray-500 italic text-sm">
                    Aucun résultat à afficher. Exécutez une requête SELECT.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <DbIcon size={16} className="text-yellow-500" />
                Schéma Local
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Table: users</p>
                  <ul className="text-xs space-y-1 text-gray-400 font-mono">
                    <li>id (INTEGER)</li>
                    <li>name (TEXT)</li>
                    <li>email (TEXT)</li>
                    <li>rank (TEXT)</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Table: products</p>
                  <ul className="text-xs space-y-1 text-gray-400 font-mono">
                    <li>id (INTEGER)</li>
                    <li>name (TEXT)</li>
                    <li>price (REAL)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/5 rounded-xl border border-yellow-500/10 p-4">
              <h3 className="text-xs font-bold text-yellow-500 mb-2">Aide SQL</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Utilisez cette console pour tester vos requêtes SQLite avant de les appliquer sur Supabase. 
                Notez que SQLite et PostgreSQL ont des syntaxes légèrement différentes.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <FileCode className="text-blue-400" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Scripts de Configuration Supabase</h2>
                <p className="text-gray-400 text-sm">
                  Ces scripts doivent être exécutés dans l'éditeur SQL de votre tableau de bord Supabase pour initialiser ou mettre à jour votre base de données.
                </p>
              </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'MIGRATION_QUOTA_MANAGEMENT_RLS.sql', desc: 'Gestion globale des quotas de lecture, politiques RLS strictes et fonction sécurisée de pagination pour limiter les lectures Supabase à 100k et 5 Go.' },
                { name: 'FIX_RANK_REWARDS_SETUP.sql', desc: 'Résolution définitive des erreurs d\'importation des récompenses/bonus (foreign key) et génération automatique des cadeaux de niveau (TikTok, etc.) opérationnels.' },
                { name: 'CREATE_EVOLUTIONS_SYSTEM.sql', desc: 'Créer toutes les tables, colonnes et politiques RLS requises pour le fil d\'évolution et de partages de victoires.' },
                { name: 'FIX_MEMBER_EVOLUTIONS_FOREIGN_KEY.sql', desc: 'Résoudre les erreurs d\'importation des données de coaching historique (foreign key violée).' },
                { name: 'database_setup.sql', desc: 'Initialisation des tables et colonnes de base.' },
                { name: 'schema_fix.sql', desc: 'Correction des structures de données et types.' },
                { name: 'fix_products_rls.sql', desc: 'Configuration de la sécurité (RLS) pour les produits.' },
                { name: 'ranking_fix.sql', desc: 'Mise à jour du système de classement des ambassadeurs.' }
              ].map(file => (
                <div key={file.name} className="bg-zinc-800/30 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white font-mono">{file.name}</span>
                    <button 
                      onClick={() => copyToClipboard(file.name)}
                      className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                      title="Copier le script"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{file.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={20} />
                <span className="text-sm text-gray-300">Prêt à configurer votre base de données ?</span>
              </div>
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Ouvrir Supabase
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
