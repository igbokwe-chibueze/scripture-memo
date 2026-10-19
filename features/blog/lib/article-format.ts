/** Stable editorial dates use UTC so server/client rendering cannot disagree. */
export function formatArticleDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

/** Reading time is a presentation estimate, never a gameplay reward or timer. */
export function articleReadingMinutes(content: string): number {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
}

/** Build query links with proper encoding while preserving all active filters. */
export function blogPageHref(base: string, page: number, q = "", category = "ALL"): string {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  if (category !== "ALL") params.set("category", category);
  return `${base}?${params.toString()}`;
}

/**
 * Markdown links support explicit web URLs and internal paths/anchors only.
 * Disallow executable/data schemes and protocol-relative tracking destinations.
 * The renderer also skips raw HTML and remote images, including in previews.
 */
export function safeArticleUrl(value: string): string | undefined {
  const url = value.trim();
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      return parsed.username || parsed.password ? undefined : parsed.href;
    } catch {
      return undefined;
    }
  }
  if (/^\/(?!\/)/.test(url) && !url.includes("\\")) return url;
  if (/^#[a-z0-9_-]+$/i.test(url)) return url;
  return undefined;
}
