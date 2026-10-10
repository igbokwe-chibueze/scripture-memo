-- Add Better Auth Admin plugin fields so its built-in session creation hook
-- can enforce account bans, while retaining Scripture Memo's existing audited
-- suspension columns as the product-facing source of truth.
ALTER TABLE "user"
ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "banReason" TEXT,
ADD COLUMN "banExpires" TIMESTAMP(3);

ALTER TABLE "session"
ADD COLUMN "impersonatedBy" TEXT;

-- Existing active suspensions must be enforced immediately after deployment.
-- A legacy suspension with an elapsed expiry remains in product history but is
-- not treated as an active Better Auth ban.
UPDATE "user"
SET
  "banned" = true,
  "banReason" = COALESCE("suspendReason", 'Account suspended'),
  "banExpires" = NULL
WHERE
  "suspendedAt" IS NOT NULL
  AND ("suspendedUntil" IS NULL OR "suspendedUntil" > CURRENT_TIMESTAMP);
