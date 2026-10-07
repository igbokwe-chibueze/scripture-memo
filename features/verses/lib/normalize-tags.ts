const LOWERCASE_TITLE_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "with",
]);

/** Gives one tag word its canonical human-readable display casing. */
function capitalizeTagWord(word: string): string {
  return word
    .split("-")
    .map((part) => part ? `${part.charAt(0).toLocaleUpperCase("en")}${part.slice(1)}` : part)
    .join("-");
}

/**
 * Creates the canonical display label shared by forms, imports, and filters.
 *
 * Tag identity remains case-insensitive through its lowercase slug. The label
 * is normalized separately so an administrator typing `GOD'S LOVE`, `god's
 * love`, or `God's Love` always sees the same readable result.
 */
export function normalizeTagLabel(value: string): string {
  const words = value.trim().toLocaleLowerCase("en").split(/\s+/).filter(Boolean);

  return words
    .map((word, index) => {
      const isEdgeWord = index === 0 || index === words.length - 1;
      return !isEdgeWord && LOWERCASE_TITLE_WORDS.has(word)
        ? word
        : capitalizeTagWord(word);
    })
    .join(" ");
}

/** Converts a comma-separated admin field into unique canonical tag labels. */
export function normalizeTags(value: string): string[] {
  const labelsBySlug = new Map<string, string>();

  for (const rawTag of value.split(",")) {
    const label = normalizeTagLabel(rawTag);
    const slug = slugifyTag(label);
    if (label && slug && !labelsBySlug.has(slug)) {
      labelsBySlug.set(slug, label);
    }
  }

  return [...labelsBySlug.values()];
}

/** Creates stable URL/database slugs for normalized tag labels. */
export function slugifyTag(tag: string): string {
  return tag
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}
