import type { SanctuaryData } from "../types/sanctuary.types";

/** Public-domain verse and synthetic learner state shared by server/client QA. */
export const SANCTUARY_TEST_DATA: SanctuaryData = {
  verseId: "preview-sanctuary-verse",
  reference: "Psalm 23:1",
  translation: "KJV",
  verseText: "The LORD is my shepherd; I shall not want.",
  reflection: "Consider the care described in this verse.",
  tags: ["Trust"],
  studySections: [
    {
      type: "KEY_LESSON",
      position: 1,
      content:
        "### A shepherd stays near\n\n**Trust grows through attention.** The verse describes care that is personal, steady, and sufficient.\n\n- Notice the promise.\n- Carry it into prayer.",
    },
  ],
  personalNote: "A sample reflection for testing.",
  isFavorite: false,
};
