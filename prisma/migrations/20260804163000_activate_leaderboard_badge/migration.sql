-- Phase 27 now derives Global Leaderboard rank on the server, so the dormant
-- Beacon Challenger criterion can safely participate in badge evaluation.
UPDATE "Badge"
SET "isActive" = TRUE,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'beacon-challenger';
