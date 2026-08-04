-- Rebuild the profile summary from authoritative learner progression.
--
-- Earlier waypoint completion transactions updated UserWaypointProgress but
-- did not increment UserProfile.totalWaypointsCompleted. Vault, Fellowship,
-- settings, and leaderboard reads intentionally use the indexed profile
-- summary, so every existing profile must be reconciled once when this fix is
-- deployed. The correlated count also corrects stale nonzero values safely.
UPDATE "UserProfile" AS profile
SET
    "totalWaypointsCompleted" = (
        SELECT COUNT(*)::INTEGER
        FROM "UserWaypointProgress" AS progress
        WHERE progress."userId" = profile."userId"
          AND progress."status" = 'COMPLETED'
    ),
    "updatedAt" = CURRENT_TIMESTAMP;
