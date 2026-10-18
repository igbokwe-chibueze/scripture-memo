-- Preserve original identity separately from createdById, which is the current leader.
-- ALTER TABLE holds its PostgreSQL exclusive lock until this transaction commits,
-- so a simultaneous handover cannot update the leader during the backfill.
BEGIN;
ALTER TABLE "Fellowship" ADD COLUMN "founderId" TEXT;

-- Accepted transfers include both member-approved and administrator-forced changes.
-- Pending/declined/cancelled offers never changed leadership and are ignored.
-- With no accepted handover, the current leader is still the original founder.
UPDATE "Fellowship" AS fellowship
SET "founderId" = COALESCE(
  (SELECT transfer."fromLeaderId"
   FROM "FellowshipLeadershipTransfer" AS transfer
   WHERE transfer."fellowshipId" = fellowship."id" AND transfer."status" = 'ACCEPTED'
   ORDER BY transfer."resolvedAt" ASC NULLS LAST, transfer."requestedAt" ASC, transfer."id" ASC
   LIMIT 1),
  fellowship."createdById"
);

-- Former founders may delete their accounts after handing over leadership.
-- Keep the fellowship and show an unavailable founder rather than blocking deletion.
ALTER TABLE "Fellowship" ADD CONSTRAINT "Fellowship_founderId_fkey"
FOREIGN KEY ("founderId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;
