-- Extend the existing translation enum without removing NIV or ESV. Those
-- values remain available for future licensed curriculum, while WEB and BSB
-- provide the complete public-domain/permission-friendly texts in this import.
ALTER TYPE "TranslationCode" ADD VALUE 'WEB';
ALTER TYPE "TranslationCode" ADD VALUE 'BSB';

-- New users and sessions start with a translation present on every imported
-- verse. Existing preferences are normalized by the guarded curriculum reset.
ALTER TABLE "UserSettings"
ALTER COLUMN "preferredTranslation" SET DEFAULT 'KJV';

ALTER TABLE "GameSession"
ALTER COLUMN "translation" SET DEFAULT 'KJV';
