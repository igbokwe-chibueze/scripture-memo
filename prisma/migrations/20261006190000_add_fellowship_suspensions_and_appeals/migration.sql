-- Adds reversible Super Admin Fellowship suspension and one independent leader appeal.
-- This is an additive local-development schema change: it preserves existing
-- Fellowship, member, join-request, closure, learning, and audit rows.
-- The partial unique index is the database-level guard against concurrent active
-- suspensions; repository advisory locks provide friendly serialized outcomes.

CREATE TYPE "FellowshipSuspensionStatus" AS ENUM (
  'ACTIVE',
  'RESTORED'
);

CREATE TYPE "FellowshipSuspensionAppealStatus" AS ENUM (
  'PENDING',
  'RESTORED',
  'UPHELD'
);

ALTER TYPE "UserNotificationType" ADD VALUE 'FELLOWSHIP_SUSPENSION';
ALTER TYPE "UserNotificationType" ADD VALUE 'FELLOWSHIP_APPEAL';

CREATE TABLE "FellowshipSuspension" (
  "id" TEXT NOT NULL,
  "fellowshipId" TEXT NOT NULL,
  "suspendedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "FellowshipSuspensionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appealDeadline" TIMESTAMP(3) NOT NULL,
  "restoredAt" TIMESTAMP(3),
  "restoredById" TEXT,
  "restorationReason" TEXT,

  CONSTRAINT "FellowshipSuspension_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FellowshipSuspension_fellowshipId_fkey"
    FOREIGN KEY ("fellowshipId") REFERENCES "Fellowship"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FellowshipSuspension_suspendedById_fkey"
    FOREIGN KEY ("suspendedById") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FellowshipSuspension_restoredById_fkey"
    FOREIGN KEY ("restoredById") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "FellowshipSuspension_fellowshipId_status_createdAt_idx"
  ON "FellowshipSuspension"("fellowshipId", "status", "createdAt" DESC);
CREATE INDEX "FellowshipSuspension_suspendedById_createdAt_idx"
  ON "FellowshipSuspension"("suspendedById", "createdAt" DESC);
CREATE UNIQUE INDEX "FellowshipSuspension_one_active_per_fellowship_idx"
  ON "FellowshipSuspension"("fellowshipId")
  WHERE "status" = 'ACTIVE';

CREATE TABLE "FellowshipSuspensionAppeal" (
  "id" TEXT NOT NULL,
  "suspensionId" TEXT NOT NULL,
  "appellantId" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "status" "FellowshipSuspensionAppealStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewerId" TEXT,
  "decisionReason" TEXT,

  CONSTRAINT "FellowshipSuspensionAppeal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FellowshipSuspensionAppeal_suspensionId_key" UNIQUE ("suspensionId"),
  CONSTRAINT "FellowshipSuspensionAppeal_suspensionId_fkey"
    FOREIGN KEY ("suspensionId") REFERENCES "FellowshipSuspension"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FellowshipSuspensionAppeal_appellantId_fkey"
    FOREIGN KEY ("appellantId") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FellowshipSuspensionAppeal_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "FellowshipSuspensionAppeal_status_submittedAt_idx"
  ON "FellowshipSuspensionAppeal"("status", "submittedAt" DESC);
CREATE INDEX "FellowshipSuspensionAppeal_appellantId_submittedAt_idx"
  ON "FellowshipSuspensionAppeal"("appellantId", "submittedAt" DESC);
