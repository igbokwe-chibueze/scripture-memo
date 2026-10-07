-- Store Super Admin defaults in PostgreSQL and preserve each existing player's
-- current five-hint allowance. New profile snapshots can then use later admin
-- choices without changing inventory for accounts that already exist.
ALTER TABLE "UserProfile"
ADD COLUMN "startingHintAllowance" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE "PlatformSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "defaultTranslation" "TranslationCode" NOT NULL DEFAULT 'KJV',
  "baseGlowPoints" INTEGER NOT NULL DEFAULT 100,
  "defaultHintAllowance" INTEGER NOT NULL DEFAULT 5,
  "adminCooldownTestingEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- The singleton row is installed during migration rather than lazily during a
-- page read, keeping ordinary GET requests free of initialization writes.
INSERT INTO "PlatformSettings" (
  "id",
  "defaultTranslation",
  "baseGlowPoints",
  "defaultHintAllowance",
  "adminCooldownTestingEnabled",
  "updatedAt"
)
VALUES ('global', 'KJV', 100, 5, TRUE, CURRENT_TIMESTAMP);
