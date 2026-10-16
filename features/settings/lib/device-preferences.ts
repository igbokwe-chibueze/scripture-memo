/**
 * Non-sensitive device presentation preferences only. Account identity, learning
 * history, rewards, translation, and timezone never enter browser storage here.
 * Individual keys avoid maintaining a JSON data store. next-themes owns `theme`.
 */
import { z } from "@/lib/zod";
import { syncAudioPreferences } from "./audio-preferences";

export const devicePreferencesSchema = z.object({
  audioEnabled: z.boolean().default(true),
  soundEffectsVolume: z.number().int().min(0).max(100).default(80),
  ambienceVolume: z.number().int().min(0).max(100).default(60),
  reducedMotion: z.boolean().default(false),
  theme: z.enum(["light", "dark", "system"]).default("system"),
});
export type DevicePreferences = z.infer<typeof devicePreferencesSchema>;
export const DEVICE_PREFERENCES_EVENT = "scripture-memo:device-preferences";
const keys = {
  audioEnabled: "scripture-memo:audio-enabled",
  soundEffectsVolume: "scripture-memo:effects-volume",
  ambienceVolume: "scripture-memo:ambience-volume",
  reducedMotion: "scripture-memo:reduced-motion",
  theme: "theme",
} as const;

/** Missing, corrupt, or blocked storage safely falls back without affecting play. */
export function readDevicePreferences(): DevicePreferences {
  const defaults = devicePreferencesSchema.parse({});
  if (typeof window === "undefined") return defaults;
  try {
    for (const name of Object.keys(keys) as (keyof DevicePreferences)[]) {
      const raw = window.localStorage.getItem(keys[name]);
      if (raw === null) continue;
      const value = name === "theme" ? raw
        : name === "audioEnabled" || name === "reducedMotion"
          ? raw === "true" ? true : raw === "false" ? false : undefined
          : raw.trim() === "" ? undefined : Number(raw);
      const parsed = devicePreferencesSchema.shape[name].safeParse(value);
      if (parsed.success) Object.assign(defaults, { [name]: parsed.data });
    }
  } catch {
    // Private browsing/storage policy may block access; defaults remain playable.
  }
  return defaults;
}

/** Validate before writes and report blocked storage to the calling UI. */
export function saveDevicePreferences(input: DevicePreferences): boolean {
  const parsed = devicePreferencesSchema.safeParse(input);
  if (!parsed.success || typeof window === "undefined") return false;
  try {
    for (const name of Object.keys(keys) as (keyof DevicePreferences)[]) {
      window.localStorage.setItem(keys[name], String(parsed.data[name]));
    }
    applyDevicePreferences(parsed.data);
    window.dispatchEvent(new Event(DEVICE_PREFERENCES_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Mirror acknowledged values for existing sound and reduced-motion consumers. */
export function applyDevicePreferences(preferences: DevicePreferences): void {
  syncAudioPreferences(preferences);
  document.documentElement.classList.toggle("reduce-motion", preferences.reducedMotion);
}
