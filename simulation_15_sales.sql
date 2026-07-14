-- ==============================================================================
-- SCRIPT DE SIMULATION AVANCÉE POUR MZ+ PREMIUM
-- BUT : Générer 15 ventes avec 100€ de commission unitaire (Total = 1500€)
--       pour un utilisateur ciblé, avec dates étalées dans le temps.
-- ==============================================================================
--
-- INSTRUCTIONS DE FONCTIONNEMENT :
-- 1. Copiez l'intégralité du code SQL ci-dessous.
-- 2. Allez sur votre tableau de bord Supabase (SQL Editor).
-- 3. Créez une nouvelle requête (New Query), collez le code et cliquez sur "Run".
-- 4. Vos graphiques, filtres de dates et portefeuilles se mettront à jour instantanément !
--

DO $$
DECLARE
    v_user_uuid UUID;
    v_product_uuid UUID := '33333333-3333-3333-3333-333333333333';
    v_target_id UUID := 'cedf9e3b-c30d-4624-9151-a7d9aced4f12'; -- ID spécifié par l'utilisateur
    v_target_email TEXT := 'mzplusofficial@gmail.com'; -- Backup search by email
    v_count INT;
BEGIN
    -- 1. Recherche de l'utilisateur d'après son ID ou email
    SELECT id INTO v_user_uuid FROM public.users WHERE id = v_target_id LIMIT 1;
    
    IF v_user_uuid IS NULL THEN
        SELECT id INTO v_user_uuid FROM public.users WHERE email = v_target_email LIMIT 1;
    END IF;

    IF v_user_uuid IS NULL THEN
        RAISE EXCEPTION 'Utilisateur introuvable pour l''ID % ou l''email : %', v_target_id, v_target_email;
    END IF;

    -- 2. Création ou mise à jour sécurisée d'un produit témoin (MZ+ Premium Plan) de 299€ (comm: 100€)
    INSERT INTO public.products (id, name, description, price, commission_amount, image_url, created_at)
    VALUES (v_product_uuid, 'Offre MZ+ Premium', 'Accès complet au système de parrainage et automatisations de ventes', 299.00, 100.00, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', NOW())
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name, 
        price = EXCLUDED.price, 
        commission_amount = EXCLUDED.commission_amount
    WHERE public.products.id = EXCLUDED.id;

    -- 3. Nettoyage des anciennes ventes de simulation de ce produit pour cet utilisateur (permet d'exécuter à l'infini pour tester sans saturer)
    DELETE FROM public.commissions 
    WHERE user_id = v_user_uuid AND product_id = v_product_uuid;

    -- 4. Génération de 15 ventes étalées sur les 7 derniers jours pour dessiner un superbe graphique d'activité
    -- Vente 1 : Il y a 10 minutes
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '10 minutes');

    -- Vente 2 : Il y a 4 heures
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '4 hours');

    -- Vente 3 : Il y a 14 heures
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '14 hours');

    -- Vente 4 : Il y a 1 jour
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '1 day');

    -- Vente 5 : Il y a 1 jour et demi
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '1.5 days');

    -- Vente 6 : Il y a 2 jours
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '2 days');

    -- Vente 7 : Il y a 2 jours et demi
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '2.5 days');

    -- Vente 8 : Il y a 3 jours
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '3 days');

    -- Vente 9 : Il y a 3 jours et demi
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '3.5 days');

    -- Vente 10 : Il y a 4 jours
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '4 days');

    -- Vente 11 : Il y a 4 jours et demi
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '4.5 days');

    -- Vente 12 : Il y a 5 jours
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '5 days');

    -- Vente 13 : Il y a 5 jours et demi
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '5.5 days');

    -- Vente 14 : Il y a 6 jours
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '6 days');

    -- Vente 15 : Il y a 7 jours
    INSERT INTO public.commissions (user_id, product_id, amount, status, created_at)
    VALUES (v_user_uuid, v_product_uuid, 100.00, 'approved', NOW() - INTERVAL '7 days');

    -- 5. Synchronisation du portefeuille de l'utilisateur (Wallets Table)
    -- On recalcule le total de toutes les commissions approuvées de cet utilisateur pour éviter les incohérences réelles de solde !
    INSERT INTO public.wallets (user_id, balance)
    VALUES (
        v_user_uuid, 
        (SELECT COALESCE(SUM(amount), 0.00) FROM public.commissions WHERE user_id = v_user_uuid AND status = 'approved')
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET balance = (SELECT COALESCE(SUM(amount), 0.00) FROM public.commissions WHERE user_id = v_user_uuid AND status = 'approved');

    -- 6. Notification de réussite
    RAISE NOTICE 'BRAVO ! Simulation des 15 ventes réussie avec succès pour % (UUID: %). Solde de portefeuille réaligné !', v_target_email, v_user_uuid;
END $$;

-- 7. Forcer PostgreSQL à rafraîchir le cache pour la réactivité en temps réel
NOTIFY pgrst, 'reload schema';
