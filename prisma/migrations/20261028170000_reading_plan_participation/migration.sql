-- Add social participation without moving private chapter/day progress to SQL.
-- Eligibility is derived at read time; inactivity never clears device progress.
CREATE TABLE "ReadingPlanParticipation" (
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ReadingPlanParticipation_pkey" PRIMARY KEY ("userId", "planId"),
  CONSTRAINT "ReadingPlanParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReadingPlanParticipation_planId_completedAt_lastActiveAt_idx"
  ON "ReadingPlanParticipation" ("planId", "completedAt", "lastActiveAt" DESC);
