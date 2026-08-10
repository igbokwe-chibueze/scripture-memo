-- Add stable catalog keys rather than storing image URLs. This allows the
-- bundled artwork to move without rewriting every learner profile.
ALTER TABLE "UserProfile"
ADD COLUMN "avatarKey" TEXT NOT NULL DEFAULT 'lion',
ADD COLUMN "avatarFrameKey" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN "isPartner" BOOLEAN NOT NULL DEFAULT false;

