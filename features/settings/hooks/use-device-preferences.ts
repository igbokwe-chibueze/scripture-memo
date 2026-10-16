"use client";

import { useSyncExternalStore } from "react";
import { DEVICE_PREFERENCES_EVENT, readDevicePreferences } from "../lib/device-preferences";

/** Subscribe to same-tab saves and other-tab storage changes; never poll. */
function subscribe(notify: () => void): () => void {
  window.addEventListener(DEVICE_PREFERENCES_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(DEVICE_PREFERENCES_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

/** Stable primitive snapshots avoid render loops; null prevents hydration mismatch. */
function snapshot(): string {
  const p = readDevicePreferences();
  return `${p.audioEnabled}|${p.soundEffectsVolume}|${p.ambienceVolume}|${p.reducedMotion}|${p.theme}`;
}

/** Signals hydration/read changes without rendering browser values on the server. */
export function useDevicePreferencesSnapshot(): string | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
