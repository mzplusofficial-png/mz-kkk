-- =========================================================================
-- MIGRATION SQL : AJOUT DU STATUT 'finalized' AUX COMMISSIONS
-- =========================================================================
-- Dans certaines bases de données Supabase, une contrainte CHECK existe sur
-- la colonne 'status' de la table 'commissions'. Si le statut 'finalized'
-- échoue à l'enregistrement, veuillez exécuter le script suivant dans le
-- "SQL Editor" de votre tableau de bord Supabase :

-- 1. Supprime l'ancienne contrainte limitante (si elle existe)
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_status_check;

-- 2. Recrée la contrainte en incluant le nouveau statut 'finalized'
ALTER TABLE commissions ADD CONSTRAINT commissions_status_check 
  CHECK (status IN ('pending', 'finalized', 'approved', 'rejected'));

-- Info : Les statuts possibles dans l'application sont désormais :
--   - 'pending'   : commission initiée (clic/formulaire initié, pas encore de vente validée)
--   - 'finalized' : vente confirmée par Chariow (enregistrée, mais pas encore créditée sur le solde de l'ambassadeur)
--   - 'approved'  : commission officiellement validée (montant crédité sur le solde de l'ambassadeur)
--   - 'rejected'  : commission refusée/annulée
