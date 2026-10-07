-- Adds pending leader-to-member handoffs and recoverable Fellowship closure.
-- Existing Fellowship, membership, progress, and join-request rows remain intact.

CREATE TYPE "FellowshipLeadershipTransferStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED'
);

CREATE TYPE "FellowshipDissolutionStatus" AS ENUM (
  'SCHEDULED',
  'CANCELLED',
  'FORCED'
);

ALTER TYPE "UserNotificationType" ADD VALUE 'FELLOWSHIP_LEADERSHIP';
ALTER TYPE "UserNotificationType" ADD VALUE 'FELLOWSHIP_CLOSING';

CREATE TABLE "FellowshipLeadershipTransfer" (
  "id" TEXT NOT NULL,
  "fellowshipId" TEXT NOT NULL,
  "fromLeaderId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "status" "FellowshipLeadershipTransferStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "FellowshipLeadershipTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FellowshipLeadershipTransfer_fellowshipId_fkey"
    FOREIGN KEY ("fellowshipId") REFERENCES "Fellowship"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FellowshipLeadershipTransfer_fromLeaderId_fkey"
    FOREIGN KEY ("fromLeaderId") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FellowshipLeadershipTransfer_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "FellowshipLeadershipTransfer_fellowshipId_status_requestedAt_idx"
  ON "FellowshipLeadershipTransfer"("fellowshipId", "status", "requestedAt" DESC);
CREATE INDEX "FellowshipLeadershipTransfer_targetUserId_status_requestedAt_idx"
  ON "FellowshipLeadershipTransfer"("targetUserId", "status", "requestedAt" DESC);
CREATE UNIQUE INDEX "FellowshipLeadershipTransfer_one_pending_per_fellowship_idx"
  ON "FellowshipLeadershipTransfer"("fellowshipId")
  WHERE "status" = 'PENDING';

CREATE TABLE "FellowshipDissolution" (
  "id" TEXT NOT NULL,
  "fellowshipId" TEXT NOT NULL,
  "initiatedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "FellowshipDissolutionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancellationDeadline" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "FellowshipDissolution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FellowshipDissolution_fellowshipId_fkey"
    FOREIGN KEY ("fellowshipId") REFERENCES "Fellowship"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FellowshipDissolution_initiatedById_fkey"
    FOREIGN KEY ("initiatedById") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "FellowshipDissolution_fellowshipId_status_createdAt_idx"
  ON "FellowshipDissolution"("fellowshipId", "status", "createdAt" DESC);
CREATE UNIQUE INDEX "FellowshipDissolution_one_open_per_fellowship_idx"
  ON "FellowshipDissolution"("fellowshipId")
  WHERE "status" IN ('SCHEDULED', 'FORCED');
