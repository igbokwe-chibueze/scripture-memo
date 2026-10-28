/** Owner-supplied category artwork. Acts shares the history category key with
 * the Old Testament, so resolve that one image using the selected testament. */
const GROUP_IMAGES: Record<string, string> = {
  pentateuch: "pentateuch",
  history: "history",
  wisdom: "wisdom",
  majorProphets: "major-prophets",
  minorProphets: "minor-prophets",
  gospels: "gospels",
  paul: "pauline-letters",
  letters: "general-letters",
  prophecy: "revelation",
};

/** Return a bundled path only; no remote lookup or user-provided URL is needed. */
export function bibleGroupArtwork(
  group: string,
  testament: "old" | "new",
): string {
  const image =
    group === "history" && testament === "new" ? "acts" : GROUP_IMAGES[group];
  return `/images/bible/groups/${image ?? "pentateuch"}.png`;
}
