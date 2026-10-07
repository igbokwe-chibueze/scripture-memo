-- Completes the backfill after the case register is first introduced. The
-- former restore audit event identified its suspension through entityId rather
-- than metadata, so this explicit join safely links that known legacy shape.
-- A previously upheld appeal is a final case outcome even though the existing
-- suspension enforcement row remains active; the case register reflects that
-- final review result without changing enforcement behavior.

UPDATE "AuditLog" AS audit
SET "governanceCaseId" = governance_case."id"
FROM "FellowshipSuspension" AS suspension
JOIN "FellowshipGovernanceCase" AS governance_case
  ON governance_case."id" = suspension."governanceCaseId"
WHERE audit."entityType" = 'FellowshipSuspension'
  AND audit."entityId" = suspension."id"
  AND audit."governanceCaseId" IS NULL;

UPDATE "FellowshipGovernanceCase" AS governance_case
SET "currentStatus" = 'UPHELD'
FROM "FellowshipSuspension" AS suspension
JOIN "FellowshipSuspensionAppeal" AS appeal
  ON appeal."suspensionId" = suspension."id"
WHERE governance_case."id" = suspension."governanceCaseId"
  AND appeal."status" = 'UPHELD';
