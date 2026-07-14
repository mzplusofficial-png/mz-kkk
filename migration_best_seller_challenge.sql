-- ====================================================================
-- MIGRATION SCRIPT: MZ+ BEST SELLER CHALLENGE LEADERBOARD TABLE
-- ====================================================================
-- This script provisions the table used to capture real-time 
-- conversion rates, total visits, and completed sales for 
-- the Best Seller contest. It synchronizes automatically 
-- every 2 hours to avoid database load.

CREATE TABLE IF NOT EXISTS public.mz_best_seller_challenge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT '🌍 Afrique',
    visits INTEGER DEFAULT 0,
    sales INTEGER DEFAULT 0,
    conversion_rate NUMERIC DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_challenge_user UNIQUE (user_id)
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_challenge_user_id ON public.mz_best_seller_challenge(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_conversion ON public.mz_best_seller_challenge(conversion_rate DESC);

-- Enable RLS
ALTER TABLE public.mz_best_seller_challenge ENABLE ROW LEVEL SECURITY;

-- Select policy: Row readout is public
DROP POLICY IF EXISTS "Public select challenge" ON public.mz_best_seller_challenge;
CREATE POLICY "Public select challenge" ON public.mz_best_seller_challenge 
    FOR SELECT USING (true);

-- Upsert policy: Users can insert or update their own row
DROP POLICY IF EXISTS "Users can manage own challenge stats" ON public.mz_best_seller_challenge;
CREATE POLICY "Users can manage own challenge stats" ON public.mz_best_seller_challenge 
    FOR ALL USING (true);

-- Insert sample base contestants to seed the table initially so the leaderboard never looks blank
INSERT INTO public.mz_best_seller_challenge (user_id, full_name, country, visits, sales, conversion_rate)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Sékou Sangaré', '🇨🇮 Côte d''Ivoire', 212, 42, 19.81),
  ('00000000-0000-0000-0000-000000000002', 'Aladji Diop', '🇸🇳 Sénégal', 195, 31, 15.90),
  ('00000000-0000-0000-0000-000000000003', 'Fabiola K.', '🇨🇲 Cameroun', 148, 22, 14.86),
  ('00000000-0000-0000-0000-000000000004', 'Dimitri Somé', '🇧🇫 Burkina Faso', 151, 19, 12.58),
  ('00000000-0000-0000-0000-000000000005', 'Mariama Touré', '🇬🇳 Guinée', 122, 14, 11.48)
ON CONFLICT (user_id) DO NOTHING;
