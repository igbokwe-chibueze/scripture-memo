/** Shared immutable plan catalogue. All views/storage validation use the same
 * schedule, preventing cross-plan progress or duplicated duration assumptions.
 */
import {
  NEW_TESTAMENT_PHASES,
  NEW_TESTAMENT_READING_DAYS,
  type ReadingPlanDay,
} from "./new-testament-reading-plan";
import {
  OLD_TESTAMENT_PHASES,
  OLD_TESTAMENT_READING_DAYS,
} from "./old-testament-reading-plan";
import { READING_PLAN_ARTWORK } from "./reading-plan-artwork";

/** A bounded client-side identity, unrelated to account IDs or game rewards. */
export type ReadingPlanId = "new-testament" | "old-testament";
/** Public plan metadata shared by discovery, phases, reader and device storage. */
export type ReadingPlanDefinition = {
  id: ReadingPlanId;
  titleKey: "title" | "oldTestamentTitle";
  cover: string;
  days: readonly ReadingPlanDay[];
  phases: readonly { start: number; end: number; books: readonly string[] }[];
  phasePrefix: "phases" | "oldTestamentPhases";
  descriptionKey: "description" | "oldTestamentDescription";
  activitiesKey: "activities" | "oldTestamentActivities";
  paceKey: "pace" | "oldTestamentPace";
  introKey: "intro" | "oldTestamentIntro";
  bookCount: number;
  chapterCompletion: boolean;
};

/** Owner-approved plans; adding one entry does not introduce runtime fetches. */
export const READING_PLANS: Readonly<
  Record<ReadingPlanId, ReadingPlanDefinition>
> = {
  "new-testament": {
    id: "new-testament",
    titleKey: "title",
    cover: READING_PLAN_ARTWORK.newTestament,
    days: NEW_TESTAMENT_READING_DAYS,
    phases: NEW_TESTAMENT_PHASES,
    phasePrefix: "phases",
    descriptionKey: "description",
    activitiesKey: "activities",
    paceKey: "pace",
    introKey: "intro",
    bookCount: 27,
    chapterCompletion: false,
  },
  "old-testament": {
    id: "old-testament",
    titleKey: "oldTestamentTitle",
    cover: READING_PLAN_ARTWORK.oldTestament,
    days: OLD_TESTAMENT_READING_DAYS,
    phases: OLD_TESTAMENT_PHASES,
    phasePrefix: "oldTestamentPhases",
    descriptionKey: "oldTestamentDescription",
    activitiesKey: "oldTestamentActivities",
    paceKey: "oldTestamentPace",
    introKey: "oldTestamentIntro",
    bookCount: 39,
    chapterCompletion: true,
  },
};
