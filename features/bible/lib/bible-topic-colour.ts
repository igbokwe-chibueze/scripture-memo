/** Stable pseudo-random pack colours derived from immutable topic IDs.
 * No Math.random during rendering (SSR hydration), storage or database writes.
 * Existing paired semantic tokens keep text readable in every app theme. */
const TOPIC_COLOURS = ["primary", "info", "decoration", "reward"] as const;

/** New IDs receive a colour automatically; labels/order never change identity. */
export function bibleTopicColour(id: string): {
  backgroundColor: string;
  color: string;
} {
  let hash = 2166136261;
  for (const character of id) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619) >>> 0;
  }
  const token = TOPIC_COLOURS[hash % TOPIC_COLOURS.length];
  return {
    backgroundColor: `var(--${token})`,
    color: `var(--${token}-foreground)`,
  };
}
