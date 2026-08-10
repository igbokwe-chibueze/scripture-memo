-- Backfill one unread notice for each historical manual badge award so players
-- granted a badge before BADGE_AWARDED existed are not silently excluded.
--
-- The reward ledger is the immutable source of truth. Its unique idempotency
-- key already contains the learner and badge identifiers, so converting that
-- prefix produces the exact same dedupe key used by future application writes.
-- ON CONFLICT makes this migration safe if a notice was already created.
INSERT INTO "UserNotification" (
  "id",
  "userId",
  "type",
  "dedupeKey",
  "payload",
  "createdAt"
)
SELECT
  'badge_notice_' || md5("idempotencyKey"),
  "userId",
  'BADGE_AWARDED'::"UserNotificationType",
  regexp_replace("idempotencyKey", '^manual-badge:', 'manual-badge-awarded:'),
  jsonb_build_object(
    'badgeName', regexp_replace("reason", '^Manual badge award: ', ''),
    'rewardAmount', "amount"
  ),
  "createdAt"
FROM "RewardLedger"
WHERE "eventType" = 'MANUAL_ADMIN_AWARD'
ON CONFLICT ("dedupeKey") DO NOTHING;
