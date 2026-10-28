/** Pure session identity/events. No storage, network or account identity. */
import type { BibleReference } from "../schemas/bible.schema";
import type { BibleAudioPlan } from "../types/bible-audio.types";

/** Same recording identity ignores verse selection but preserves plan provenance. */
export function bibleAudioKey(
  reference: BibleReference,
  plan?: BibleAudioPlan,
): string {
  return `${reference.translation}:${reference.book}:${reference.chapter}:${plan ? `${plan.planId}:${plan.day}` : "reading"}`;
}

export const BIBLE_AUDIO_NAVIGATE = "scripture-memo:bible-audio-navigate";
export const BIBLE_AUDIO_REST = "scripture-memo:bible-audio-rest";
