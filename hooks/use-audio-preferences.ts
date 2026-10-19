"use client";

import { useSyncExternalStore } from "react";
import { AUDIO_PREFERENCES_EVENT, readAudioVolume } from "@/features/settings/lib/audio-preferences";

/** Stable primitive snapshot prevents needless rerenders or external-store loops. */
function getSnapshot(): string {
  return `${document.documentElement.dataset.audioEnabled !== "false"}|${readAudioVolume("ambience")}`;
}

/** Subscribe to explicit preference changes rather than polling DOM or server state. */
function subscribe(notify: () => void): () => void {
  window.addEventListener(AUDIO_PREFERENCES_EVENT, notify);
  return () => window.removeEventListener(AUDIO_PREFERENCES_EVENT, notify);
}

/** Reactively supplies mute/ambience values to an already mounted celebration. */
export function useAudioPreferences(): { enabled: boolean; ambienceVolume: number } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "true|60");
  const [enabled, volume] = snapshot.split("|");
  return { enabled: enabled === "true", ambienceVolume: Number(volume) };
}
