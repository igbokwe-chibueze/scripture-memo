-- CreateEnum
CREATE TYPE "UserNotificationType" AS ENUM (
  'LEAGUE_PROMOTED',
  'LEAGUE_DEMOTED',
  'LEAGUE_STAYED',
  'FELLOWSHIP_INVITE',
  'FELLOWSHIP_REQUEST',
  'COOLDOWN_READY',
  'STREAK_RISK',
  'SYSTEM'
);

-- CreateTable
CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "UserNotificationType" NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "readAt" TIMESTAMP(3),
  "presentedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotification_dedupeKey_key"
ON "UserNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "UserNotification_userId_createdAt_idx"
ON "UserNotification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserNotification_userId_readAt_createdAt_idx"
ON "UserNotification"("userId", "readAt", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
