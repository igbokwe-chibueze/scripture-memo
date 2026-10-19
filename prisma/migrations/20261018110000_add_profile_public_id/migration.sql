-- Public navigation identity, separate from private profile and auth record IDs.
-- Existing profiles receive random UUIDs once; future inserts use the same DB default.
BEGIN;
ALTER TABLE "UserProfile" ADD COLUMN "publicId" UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX "UserProfile_publicId_key" ON "UserProfile"("publicId");
COMMIT;
