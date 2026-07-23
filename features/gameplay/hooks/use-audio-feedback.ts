"use client";

import { useCallback } from "react";

export type AudioFeedbackName =
  | "pick"
  | "drop"
  | "error"
  | "correct"
  | "day-complete"
  | "waypoint-complete"
  | "badge-unlock";

/**
 * Plays optional feedback only when the synchronized user preference permits it.
 *
 * Audio is progressive enhancement: missing files, autoplay restrictions, and
 * playback failures are intentionally swallowed so they never interrupt play.
 */
export function useAudioFeedback(): (name: AudioFeedbackName) => void {
  return useCallback((name: AudioFeedbackName): void => {
    if (
      typeof document === "undefined" ||
      document.documentElement.dataset.audioEnabled === "false"
    ) {
      return;
    }

    const audio = new Audio(`/audio/${name}.mp3`);
    void audio.play().catch(() => {
      // WHY: Optional feedback must not turn a valid interaction into an error.
    });
  }, []);
}
