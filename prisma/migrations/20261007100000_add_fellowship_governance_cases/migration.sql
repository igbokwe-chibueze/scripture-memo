-- Adds a searchable, immutable case register for Fellowship transfers,
-- suspensions, and closures. Existing governance rows are retained and receive
-- stable case numbers; existing audit entries are attached wherever their
-- structured metadata identifies the related governance record.
--
-- Historical transfer rows did not record every lifecycle event. This
-- migration therefore adds an explicit legacy request event and, when a
-- transfer already has a resolution timestamp, a neutral status snapshot. It
-- does not guess why an old transfer was cancelled or who initiated that
-- cancellation when the old schema did not retain that information.

CREATE TYPE "FellowshipGovernanceCaseKind" AS ENUM (
  'TRANSFER',
  'SUSPENSION',
  'CLOSURE'
);

CREATE TABLE "FellowshipGovernanceCase" (
  "id" TEXT NOT NULL,
  "caseSequence" SERIAL NOT NULL,
  "caseNumber" TEXT NOT NULL,
  "kind" "FellowshipGovernanceCaseKind" NOT NULL,
  "currentStatus" TEXT NOT NULL,
  "fellowshipId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FellowshipGovernanceCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FellowshipGovernanceCase_caseSequence_key" UNIQUE ("caseSequence"),
  CONSTRAINT "FellowshipGovernanceCase_caseNumber_key" UNIQUE ("caseNumber"),
  CONSTRAINT "FellowshipGovernanceCase_fellowshipId_fkey"
    FOREIGN KEY ("fellowshipId") REFERENCES "Fellowship"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FellowshipGovernanceCase_openedById_fkey"
    FOREIGN KEY ("openedById") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- One global sequence makes case numbers unique across all three case types.
-- Ordering by the original action timestamp keeps the pre-existing history
-- predictable while IDs provide a stable tie-breaker for simultaneous writes.
WITH legacy_cases AS (
  SELECT
    'transfer:' || transfer."id" AS "sourceKey",
    transfer."id" AS "sourceId",
    transfer."fellowshipId",
    transfer."fromLeaderId" AS "openedById",
    transfer."requestedAt" AS "openedAt",
    'TRANSFER'::"FellowshipGovernanceCaseKind" AS "kind",
    transfer."status"::TEXT AS "currentStatus"
  FROM "FellowshipLeadershipTransfer" AS transfer

  UNION ALL

  SELECT
    'suspension:' || suspension."id",
    suspension."id",
    suspension."fellowshipId",
    suspension."suspendedById",
    suspension."createdAt",
    'SUSPENSION'::"FellowshipGovernanceCaseKind",
    suspension."status"::TEXT
  FROM "FellowshipSuspension" AS suspension

  UNION ALL

  SELECT
    'closure:' || dissolution."id",
    dissolution."id",
    dissolution."fellowshipId",
    dissolution."initiatedById",
    dissolution."createdAt",
    'CLOSURE'::"FellowshipGovernanceCaseKind",
    dissolution."status"::TEXT
  FROM "FellowshipDissolution" AS dissolution
), numbered_cases AS (
  SELECT
    legacy_cases.*,
    ROW_NUMBER() OVER (
      ORDER BY legacy_cases."openedAt", legacy_cases."kind", legacy_cases."sourceId"
    ) AS "sequence"
  FROM legacy_cases
)
INSERT INTO "FellowshipGovernanceCase" (
  "id",
  "caseSequence",
  "caseNumber",
  "kind",
  "currentStatus",
  "fellowshipId",
  "openedById",
  "openedAt"
)
SELECT
  'fellowship-case-' || numbered_cases."sourceKey",
  numbered_cases."sequence",
  'FEL-' || LPAD(numbered_cases."sequence"::TEXT, 6, '0'),
  numbered_cases."kind",
  numbered_cases."currentStatus",
  numbered_cases."fellowshipId",
  numbered_cases."openedById",
  numbered_cases."openedAt"
FROM numbered_cases;

-- The explicit historical sequence values above must advance the identity
-- sequence before new cases are created by the application.
SELECT setval(
  pg_get_serial_sequence('"FellowshipGovernanceCase"', 'caseSequence'),
  COALESCE((SELECT MAX("caseSequence") FROM "FellowshipGovernanceCase"), 1),
  EXISTS (SELECT 1 FROM "FellowshipGovernanceCase")
);

ALTER TABLE "FellowshipLeadershipTransfer"
  ADD COLUMN "governanceCaseId" TEXT;
ALTER TABLE "FellowshipDissolution"
  ADD COLUMN "governanceCaseId" TEXT;
ALTER TABLE "FellowshipSuspension"
  ADD COLUMN "governanceCaseId" TEXT;

UPDATE "FellowshipLeadershipTransfer" AS transfer
SET "governanceCaseId" = governance_case."id"
FROM "FellowshipGovernanceCase" AS governance_case
WHERE governance_case."kind" = 'TRANSFER'
  AND governance_case."id" = 'fellowship-case-transfer:' || transfer."id";

UPDATE "FellowshipDissolution" AS dissolution
SET "governanceCaseId" = governance_case."id"
FROM "FellowshipGovernanceCase" AS governance_case
WHERE governance_case."kind" = 'CLOSURE'
  AND governance_case."id" = 'fellowship-case-closure:' || dissolution."id";

UPDATE "FellowshipSuspension" AS suspension
SET "governanceCaseId" = governance_case."id"
FROM "FellowshipGovernanceCase" AS governance_case
WHERE governance_case."kind" = 'SUSPENSION'
  AND governance_case."id" = 'fellowship-case-suspension:' || suspension."id";

ALTER TABLE "FellowshipLeadershipTransfer"
  ALTER COLUMN "governanceCaseId" SET NOT NULL,
  ADD CONSTRAINT "FellowshipLeadershipTransfer_governanceCaseId_key"
    UNIQUE ("governanceCaseId"),
  ADD CONSTRAINT "FellowshipLeadershipTransfer_governanceCaseId_fkey"
    FOREIGN KEY ("governanceCaseId") REFERENCES "FellowshipGovernanceCase"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FellowshipDissolution"
  ALTER COLUMN "governanceCaseId" SET NOT NULL,
  ADD CONSTRAINT "FellowshipDissolution_governanceCaseId_key"
    UNIQUE ("governanceCaseId"),
  ADD CONSTRAINT "FellowshipDissolution_governanceCaseId_fkey"
    FOREIGN KEY ("governanceCaseId") REFERENCES "FellowshipGovernanceCase"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FellowshipSuspension"
  ALTER COLUMN "governanceCaseId" SET NOT NULL,
  ADD CONSTRAINT "FellowshipSuspension_governanceCaseId_key"
    UNIQUE ("governanceCaseId"),
  ADD CONSTRAINT "FellowshipSuspension_governanceCaseId_fkey"
    FOREIGN KEY ("governanceCaseId") REFERENCES "FellowshipGovernanceCase"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD COLUMN "governanceCaseId" TEXT,
  ADD CONSTRAINT "AuditLog_governanceCaseId_fkey"
    FOREIGN KEY ("governanceCaseId") REFERENCES "FellowshipGovernanceCase"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link historic audit entries by their recorded entity identifiers. The
-- cases are created for every legacy record, so unmatched/other AuditLog rows
-- retain their original generic audit visibility and stay unassigned here.
UPDATE "AuditLog" AS audit
SET "governanceCaseId" = governance_case."id"
FROM "FellowshipGovernanceCase" AS governance_case
WHERE governance_case."kind" = 'TRANSFER'
  AND audit."metadata" ->> 'transferId' = SUBSTRING(
    governance_case."id" FROM LENGTH('fellowship-case-transfer:') + 1
  );

UPDATE "AuditLog" AS audit
SET "governanceCaseId" = governance_case."id"
FROM "FellowshipGovernanceCase" AS governance_case
WHERE governance_case."kind" = 'CLOSURE'
  AND audit."metadata" ->> 'dissolutionId' = SUBSTRING(
    governance_case."id" FROM LENGTH('fellowship-case-closure:') + 1
  );

UPDATE "AuditLog" AS audit
SET "governanceCaseId" = governance_case."id"
FROM "FellowshipGovernanceCase" AS governance_case
WHERE governance_case."kind" = 'SUSPENSION'
  AND audit."metadata" ->> 'suspensionId' = SUBSTRING(
    governance_case."id" FROM LENGTH('fellowship-case-suspension:') + 1
  );

-- Fill the transfer events that the former implementation did not audit.
-- They are historical snapshots, not fabricated claims about who caused them.
INSERT INTO "AuditLog" (
  "id", "actorId", "action", "entityType", "entityId", "metadata",
  "governanceCaseId", "createdAt"
)
SELECT
  'legacy-transfer-request-' || transfer."id",
  transfer."fromLeaderId",
  'FELLOWSHIP_LEADERSHIP_TRANSFER_REQUESTED',
  'FellowshipLeadershipTransfer',
  transfer."id",
  jsonb_build_object('legacyRecord', true),
  governance_case."id",
  transfer."requestedAt"
FROM "FellowshipLeadershipTransfer" AS transfer
JOIN "FellowshipGovernanceCase" AS governance_case
  ON governance_case."id" = transfer."governanceCaseId";

INSERT INTO "AuditLog" (
  "id", "actorId", "action", "entityType", "entityId", "metadata",
  "governanceCaseId", "createdAt"
)
SELECT
  'legacy-transfer-status-' || transfer."id",
  NULL,
  'FELLOWSHIP_LEADERSHIP_TRANSFER_LEGACY_STATUS',
  'FellowshipLeadershipTransfer',
  transfer."id",
  jsonb_build_object('legacyRecord', true, 'status', transfer."status"::TEXT),
  governance_case."id",
  transfer."resolvedAt"
FROM "FellowshipLeadershipTransfer" AS transfer
JOIN "FellowshipGovernanceCase" AS governance_case
  ON governance_case."id" = transfer."governanceCaseId"
WHERE transfer."resolvedAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "AuditLog" AS audit
    WHERE audit."governanceCaseId" = governance_case."id"
      AND audit."action" IN (
        'FELLOWSHIP_LEADERSHIP_TRANSFER_ACCEPTED',
        'FELLOWSHIP_LEADERSHIP_TRANSFER_DECLINED',
        'FELLOWSHIP_LEADERSHIP_TRANSFER_CANCELLED'
      )
  );

CREATE INDEX "FellowshipGovernanceCase_kind_openedAt_idx"
  ON "FellowshipGovernanceCase"("kind", "openedAt" DESC);
CREATE INDEX "FellowshipGovernanceCase_currentStatus_openedAt_idx"
  ON "FellowshipGovernanceCase"("currentStatus", "openedAt" DESC);
CREATE INDEX "FellowshipGovernanceCase_fellowshipId_openedAt_idx"
  ON "FellowshipGovernanceCase"("fellowshipId", "openedAt" DESC);
CREATE INDEX "AuditLog_governanceCaseId_createdAt_idx"
  ON "AuditLog"("governanceCaseId", "createdAt" DESC);
