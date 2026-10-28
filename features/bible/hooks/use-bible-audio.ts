"use client";

/** Persistent playback API. Routes attach controls, but never own the media lifetime. */
import { createContext, useContext } from "react";
import type {
  BibleAudioChapter,
  BibleAudioPlan,
} from "../types/bible-audio.types";
import type { BibleReference } from "../schemas/bible.schema";

export type BibleAudioContextValue = {
  current: BibleAudioChapter | null;
  readerKey: string | null;
  expanded: boolean;
  returnRequested: boolean;
  consumeReturn: () => void;
  fallbackAllowed: boolean;
  planAutoplay: boolean;
  participationFailed: boolean;
  retryParticipation: () => void;
  prepare: () => void;
  attachReader: (key: string) => () => void;
  openChapter: (
    chapter: Omit<BibleAudioChapter, "started" | "audioTranslation">,
  ) => void;
  toggle: (
    reference: BibleReference,
    audio: Record<string, string>,
    plan?: BibleAudioPlan,
  ) => void;
  toggleAutoplay: () => void;
};
export const BibleAudioContext = createContext<BibleAudioContextValue | null>(
  null,
);

/** A missing protected layout is a programming error, never a silent second player. */
export function useBibleAudio(): BibleAudioContextValue {
  const value = useContext(BibleAudioContext);
  if (!value) throw new Error("BibleAudioProvider is required.");
  return value;
}
