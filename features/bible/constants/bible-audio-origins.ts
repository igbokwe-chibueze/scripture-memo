/** Exact HTTPS origins approved for the provider's BSB recordings. Shared with
 * CSP so validated audio is also playable after client navigation from Game.
 * No wildcard, arbitrary remote host or extra browser connect permission.
 */
export const BIBLE_AUDIO_ORIGINS = [
  "https://audio.bible.helloao.org",
  "https://openbible.com",
] as const;
