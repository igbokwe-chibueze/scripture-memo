-- Future roadmap features cannot yet emit trusted server progress events.
-- Keep their catalogue definitions for planning while preventing activation
-- from suggesting that players can currently earn them.
UPDATE "Badge"
SET "isActive" = FALSE
WHERE "criteriaKey" IN (
  'MASTER_STAGE_FAST',
  'RECALL_FAST',
  'VAULT_REPLAYS',
  'FELLOWSHIP_JOIN',
  'FELLOWSHIP_CREATE',
  'LEADERBOARD_TOP_100'
);
