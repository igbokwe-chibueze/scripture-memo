-- Phase 26 now emits trusted, server-derived Fellowship metrics. These badges
-- can therefore be activated without accepting client-authored progress.
UPDATE "Badge"
SET "isActive" = TRUE,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('community-member', 'faith-builder');
