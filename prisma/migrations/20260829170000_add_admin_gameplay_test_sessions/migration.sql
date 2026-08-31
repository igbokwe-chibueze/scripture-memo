-- Distinguish administrator-only Journey Stage tests from learner progression
-- and Vault review. The optional target mode lets the real gameplay engine run
-- one selected mode without fabricating completion records for earlier modes.
ALTER TABLE "GameSession"
ADD COLUMN "isAdminTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "adminTestMode" "GameMode";

CREATE INDEX "GameSession_userId_isAdminTest_createdAt_idx"
ON "GameSession"("userId", "isAdminTest", "createdAt" DESC);
