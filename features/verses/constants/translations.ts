import type { TranslationCode } from "@/lib/generated/prisma/enums";

/**
 * Translation codes backed by complete text in the current curriculum.
 * Licensed NIV/ESV enum values remain valid database history but are not offered
 * to learners until matching licensed content is supplied.
 */
export const AVAILABLE_TRANSLATION_CODES = ["KJV", "WEB", "BSB"] as const;

/** All translation fields administrators may maintain on a verse. */
export const ADMIN_TRANSLATION_CODES = [
  "KJV",
  "WEB",
  "BSB",
  "NIV",
  "ESV",
] as const satisfies readonly TranslationCode[];

/** Human-readable names shared by onboarding, settings, and admin surfaces. */
export const TRANSLATION_NAMES = {
  KJV: "King James Version",
  WEB: "World English Bible",
  BSB: "Berean Standard Bible",
  NIV: "New International Version",
  ESV: "English Standard Version",
} as const satisfies Record<TranslationCode, string>;
