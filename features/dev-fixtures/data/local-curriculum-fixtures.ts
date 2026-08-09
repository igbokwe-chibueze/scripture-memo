import type { JourneyStage } from "@/lib/generated/prisma/enums";

/** Data required to create one deterministic, local-only playable waypoint. */
export type LocalCurriculumFixture = {
  waypointNumber: number;
  journeyStage: JourneyStage;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  kjvText: string;
  reflection: string;
  studyNote: string;
};

/**
 * Five compact KJV fixtures exercise every trail position and all gameplay modes.
 * KJV is used because it is public-domain source material in the United States.
 * We intentionally do not copy this text into NIV or ESV-labelled records.
 */
export const LOCAL_CURRICULUM_FIXTURES: readonly LocalCurriculumFixture[] = [
  {
    waypointNumber: 1,
    journeyStage: "LEARN",
    reference: "1 Corinthians 13:4–5",
    book: "1 Corinthians",
    chapter: 13,
    verseStart: 4,
    verseEnd: 5,
    kjvText:
      "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil.",
    reflection: "Patient love chooses kindness instead of self-interest.",
    studyNote: "Notice the repeated actions that describe what love does and avoids.",
  },
  {
    waypointNumber: 2,
    journeyStage: "LEARN",
    reference: "1 Thessalonians 5:16–18",
    book: "1 Thessalonians",
    chapter: 5,
    verseStart: 16,
    verseEnd: 18,
    kjvText:
      "Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you.",
    reflection: "Joy, prayer, and gratitude form a steady daily rhythm.",
    studyNote: "Memorize the three short commands first, then attach the reason.",
  },
  {
    waypointNumber: 3,
    journeyStage: "LEARN",
    reference: "1 Peter 5:7",
    book: "1 Peter",
    chapter: 5,
    verseStart: 7,
    verseEnd: null,
    kjvText: "Casting all your care upon him; for he careth for you.",
    reflection: "God's care gives us somewhere safe to place anxiety.",
    studyNote: "Link the two uses of care: what we release and why we can release it.",
  },
  {
    waypointNumber: 4,
    journeyStage: "LEARN",
    reference: "Psalm 119:105",
    book: "Psalm",
    chapter: 119,
    verseStart: 105,
    verseEnd: null,
    kjvText: "Thy word is a lamp unto my feet, and a light unto my path.",
    reflection: "Scripture offers light for both the next step and the road ahead.",
    studyNote: "Pair lamp with feet and light with path to remember the parallel structure.",
  },
  {
    waypointNumber: 5,
    journeyStage: "LEARN",
    reference: "Philippians 4:13",
    book: "Philippians",
    chapter: 4,
    verseStart: 13,
    verseEnd: null,
    kjvText: "I can do all things through Christ which strengtheneth me.",
    reflection: "Endurance is grounded in strength received from Christ.",
    studyNote: "Keep the sentence's movement: I can, through Christ, who strengthens.",
  },
] as const;
