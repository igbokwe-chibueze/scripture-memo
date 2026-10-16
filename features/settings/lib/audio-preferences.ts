/** Account-backed audio preferences are mirrored by PreferenceSync. This module
 * is browser-safe and never reads storage, polls, or accesses the database. */
export const DEFAULT_SOUND_EFFECTS_VOLUME = 80;
export const DEFAULT_AMBIENCE_VOLUME = 60;
export const AUDIO_PREFERENCES_EVENT = "scripture-memo:audio-preferences";

/** Clamp browser presentation data; server inputs are independently Zod-checked. */
export function normalizeAudioVolume(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return value === undefined || value === null || value === "" || !Number.isFinite(number)
    ? fallback
    : Math.min(100, Math.max(0, number));
}

/** Read one current volume without a render, request, or persistent side effect. */
export function readAudioVolume(kind: "effects" | "ambience"): number {
  const fallback = kind === "effects" ? DEFAULT_SOUND_EFFECTS_VOLUME : DEFAULT_AMBIENCE_VOLUME;
  if (typeof document === "undefined") return fallback;
  const value = kind === "effects"
    ? document.documentElement.dataset.soundEffectsVolume
    : document.documentElement.dataset.ambienceVolume;
  return normalizeAudioVolume(value, fallback);
}

/** Apply only acknowledged account preferences and notify active sound consumers. */
export function syncAudioPreferences(preferences: {
  audioEnabled: boolean;
  soundEffectsVolume: number;
  ambienceVolume: number;
}): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.audioEnabled = String(preferences.audioEnabled);
  root.dataset.soundEffectsVolume = String(preferences.soundEffectsVolume);
  root.dataset.ambienceVolume = String(preferences.ambienceVolume);
  window.dispatchEvent(new Event(AUDIO_PREFERENCES_EVENT));
}
