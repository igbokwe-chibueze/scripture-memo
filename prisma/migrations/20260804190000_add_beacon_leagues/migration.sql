CREATE TYPE "BeaconLeague" AS ENUM (
  'TRAVELER', 'DISCIPLE', 'MESSENGER', 'WATCHMAN', 'TEACHER',
  'SHEPHERD', 'ELDER', 'SCRIBE', 'SAINT'
);

ALTER TABLE "UserProfile"
  ADD COLUMN "beaconXp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "beaconLevel" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "beaconCrowns" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "BeaconXpLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeaconXpLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BeaconWeek" (
  "id" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeaconWeek_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BeaconWeeklyScore" (
  "id" TEXT NOT NULL,
  "weekId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "modesCompleted" INTEGER NOT NULL DEFAULT 0,
  "waypointsCompleted" INTEGER NOT NULL DEFAULT 0,
  "lastScoredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BeaconWeeklyScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BeaconLeagueCohort" (
  "id" TEXT NOT NULL,
  "weekId" TEXT NOT NULL,
  "league" "BeaconLeague" NOT NULL,
  "groupNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeaconLeagueCohort_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BeaconLeagueMembership" (
  "id" TEXT NOT NULL,
  "weekId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "league" "BeaconLeague" NOT NULL,
  "previousLeague" "BeaconLeague",
  "finalRank" INTEGER,
  "crownAward" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeaconLeagueMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BeaconXpLedger_idempotencyKey_key" ON "BeaconXpLedger"("idempotencyKey");
CREATE INDEX "BeaconXpLedger_userId_earnedAt_idx" ON "BeaconXpLedger"("userId", "earnedAt" DESC);
CREATE UNIQUE INDEX "BeaconWeek_startsAt_key" ON "BeaconWeek"("startsAt");
CREATE UNIQUE INDEX "BeaconWeek_endsAt_key" ON "BeaconWeek"("endsAt");
CREATE UNIQUE INDEX "BeaconWeeklyScore_weekId_userId_key" ON "BeaconWeeklyScore"("weekId", "userId");
CREATE INDEX "BeaconWeeklyScore_weekId_points_waypointsCompleted_lastScoredAt_idx" ON "BeaconWeeklyScore"("weekId", "points" DESC, "waypointsCompleted" DESC, "lastScoredAt");
CREATE UNIQUE INDEX "BeaconLeagueCohort_weekId_league_groupNumber_key" ON "BeaconLeagueCohort"("weekId", "league", "groupNumber");
CREATE INDEX "BeaconLeagueCohort_weekId_league_idx" ON "BeaconLeagueCohort"("weekId", "league");
CREATE UNIQUE INDEX "BeaconLeagueMembership_weekId_userId_key" ON "BeaconLeagueMembership"("weekId", "userId");
CREATE INDEX "BeaconLeagueMembership_cohortId_userId_idx" ON "BeaconLeagueMembership"("cohortId", "userId");
CREATE INDEX "BeaconLeagueMembership_userId_createdAt_idx" ON "BeaconLeagueMembership"("userId", "createdAt" DESC);
CREATE INDEX "UserProfile_beaconLevel_beaconXp_idx" ON "UserProfile"("beaconLevel" DESC, "beaconXp" DESC);

ALTER TABLE "BeaconXpLedger" ADD CONSTRAINT "BeaconXpLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BeaconWeeklyScore" ADD CONSTRAINT "BeaconWeeklyScore_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "BeaconWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BeaconWeeklyScore" ADD CONSTRAINT "BeaconWeeklyScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BeaconLeagueCohort" ADD CONSTRAINT "BeaconLeagueCohort_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "BeaconWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BeaconLeagueMembership" ADD CONSTRAINT "BeaconLeagueMembership_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "BeaconWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BeaconLeagueMembership" ADD CONSTRAINT "BeaconLeagueMembership_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "BeaconLeagueCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BeaconLeagueMembership" ADD CONSTRAINT "BeaconLeagueMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
