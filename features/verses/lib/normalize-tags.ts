/** Converts a comma-separated admin field into unique normalized tag labels. */
export function normalizeTags(value: string): string[] {
  return [...new Set(
    value
      .split(",")
      .map((tag) => tag.trim().toLocaleLowerCase("en"))
      .filter(Boolean),
  )];
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
