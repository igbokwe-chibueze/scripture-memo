/** Device-only playback choices. No account identity or DB calls. Narrators
 * must also exist in the current chapter before a stored name is used. */
import { z } from "zod";
export const BIBLE_AUDIO_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const schema = z.object({
  speed: z
    .number()
    .refine((value) => BIBLE_AUDIO_SPEEDS.some((speed) => speed === value)),
  narrator: z.string().max(120),
});
export type BibleAudioPreferences = z.infer<typeof schema>;
const KEY = "scripture-memo:bible-audio";
const EVENT = "scripture-memo:bible-audio-change";
/** Stable primitive snapshot; inaccessible storage acts like an initial visit. */
export function readBibleAudioSnapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
/** Validate browser data before allowing it to influence media properties. */
export function parseBibleAudioPreferences(
  snapshot: string,
): BibleAudioPreferences {
  const params = new URLSearchParams(snapshot);
  const parsed = schema.safeParse({
    speed: Number(params.get("speed")),
    narrator: params.get("narrator") ?? "",
  });
  return parsed.success ? parsed.data : { speed: 1, narrator: "" };
}
/** Save synchronously; callers surface storage failures without blocking audio. */
export function saveBibleAudioPreferences(value: BibleAudioPreferences): void {
  const parsed = schema.parse(value);
  window.localStorage.setItem(
    KEY,
    new URLSearchParams({
      speed: String(parsed.speed),
      narrator: parsed.narrator,
    }).toString(),
  );
  window.dispatchEvent(new Event(EVENT));
}
/** Subscribe to actual saves, not a recurring timer or server request. */
export function subscribeBibleAudioPreferences(notify: () => void): () => void {
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}
