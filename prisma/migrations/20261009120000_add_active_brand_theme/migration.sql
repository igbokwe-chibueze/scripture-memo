-- Store the global brand selection independently from each player's saved
-- light, dark, or system appearance preference. Existing installs preserve
-- their current Tropical Teal palette automatically.
ALTER TABLE "PlatformSettings"
ADD COLUMN "activeBrandThemeId" TEXT NOT NULL DEFAULT 'tropical-teal';
