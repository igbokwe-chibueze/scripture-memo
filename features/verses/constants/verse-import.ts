/** Maximum CSV payload size accepted by both the browser and Server Actions. */
export const MAX_VERSE_IMPORT_BYTES = 1_000_000;

/**
 * Keeps one transaction bounded while still covering a substantial curriculum
 * import. Larger libraries can be split into predictable, reviewable batches.
 */
export const MAX_VERSE_IMPORT_ROWS = 100;

/** Canonical CSV contract used by template generation and strict server parsing. */
export const VERSE_IMPORT_HEADERS = [
  "book",
  "chapter",
  "verseStart",
  "verseEnd",
  "NIV",
  "ESV",
  "KJV",
  "reflection",
  "studyNote",
  "tags",
  "isActive",
] as const;

/** Header-only template prevents example Scripture from being imported accidentally. */
export const VERSE_IMPORT_TEMPLATE = `${VERSE_IMPORT_HEADERS.join(",")}\r\n`;
