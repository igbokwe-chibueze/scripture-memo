-- Grandfather local accounts that existed before email verification was
-- introduced. This is a one-time migration, so newly registered accounts keep
-- Better Auth's default `emailVerified = false` and must verify before login.
--
-- The UTC cutoff is the rollout boundary: accounts created before 2026-09-27
-- are treated as pre-verification users. The production database is not used
-- for development; before launch its contents are refreshed from the approved
-- local release snapshot with development/test users excluded.
--
-- Setting `updatedAt` records the fact that the account's security state was
-- intentionally grandfathered. Reverting this update would re-lock these
-- accounts at sign-in, so rollback requires an explicit account-by-account
-- decision rather than an automatic inverse migration.
UPDATE "user"
SET
  "emailVerified" = TRUE,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "emailVerified" = FALSE
  AND "createdAt" < TIMESTAMPTZ '2026-09-27 00:00:00+00';
