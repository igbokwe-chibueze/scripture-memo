-- Store only a coarse activity heartbeat. The application exposes a short-lived
-- online indicator, never an exact public last-seen timestamp.
ALTER TABLE "UserProfile"
ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "UserProfile_lastSeenAt_idx"
ON "UserProfile"("lastSeenAt");

