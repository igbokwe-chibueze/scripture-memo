-- Give the event-driven badge engine an explicit, indexed criterion identity.
-- The MANUAL fallback preserves any pre-existing administrator-created rows.
ALTER TABLE "Badge"
ADD COLUMN "criteriaKey" TEXT NOT NULL DEFAULT 'MANUAL';

CREATE INDEX "Badge_criteriaKey_isActive_idx"
ON "Badge"("criteriaKey", "isActive");
