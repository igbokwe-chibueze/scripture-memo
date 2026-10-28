/** In-memory playback identity and navigation contract; never account progress. */
import type { BibleReference } from "../schemas/bible.schema";
import type { ReadingPlanId } from "../data/reading-plan-catalog";

export type BibleAudioPlan = { planId: ReadingPlanId; day: number };
export type BibleAudioChapter = {
  reference: BibleReference;
  audio: Record<string, string>;
  audioTranslation: BibleReference["translation"];
  plan?: BibleAudioPlan;
  autoStart: boolean;
  started: boolean;
};
