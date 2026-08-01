-- Phase 23 now emits a trusted, server-derived completed Vault replay metric.
-- Activating the existing catalogue row allows evaluation without recreating
-- the badge or disturbing any learner progress already attached to its ID.
UPDATE "Badge"
SET "isActive" = TRUE
WHERE "slug" = 'vault-explorer'
  AND "criteriaKey" = 'VAULT_REPLAYS';
