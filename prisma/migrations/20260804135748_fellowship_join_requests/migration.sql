-- CreateEnum
CREATE TYPE "FellowshipJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FellowshipJoinRequestSource" AS ENUM ('DIRECTORY', 'INVITE');

-- CreateTable
CREATE TABLE "FellowshipJoinRequest" (
    "id" TEXT NOT NULL,
    "fellowshipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "FellowshipJoinRequestSource" NOT NULL,
    "status" "FellowshipJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "FellowshipJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FellowshipJoinRequest_fellowshipId_status_requestedAt_idx" ON "FellowshipJoinRequest"("fellowshipId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "FellowshipJoinRequest_userId_status_requestedAt_idx" ON "FellowshipJoinRequest"("userId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "FellowshipJoinRequest_reviewedById_idx" ON "FellowshipJoinRequest"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "FellowshipJoinRequest_fellowshipId_userId_key" ON "FellowshipJoinRequest"("fellowshipId", "userId");

-- AddForeignKey
ALTER TABLE "FellowshipJoinRequest" ADD CONSTRAINT "FellowshipJoinRequest_fellowshipId_fkey" FOREIGN KEY ("fellowshipId") REFERENCES "Fellowship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowshipJoinRequest" ADD CONSTRAINT "FellowshipJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowshipJoinRequest" ADD CONSTRAINT "FellowshipJoinRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
