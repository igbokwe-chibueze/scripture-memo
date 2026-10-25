/** Display-only structure for publisher-supplied plain-text commentary. Never
 * infer theology, rewrite sentences, or treat source text as executable HTML.
 */
export type CommentaryTextBlock =
  | { type: "paragraph"; text: string }
  | {
      type: "list";
      style:
        | "roman"
        | "decimal"
        | "parenthesized"
        | "bracketed"
        | "letter"
        | "bullet";
      items: { marker: string; blocks: CommentaryTextBlock[] }[];
    };

type ListBlock = Extract<CommentaryTextBlock, { type: "list" }>;

/** Recognize explicit source markers, preserving their exact printed indexes.
 * A colon is never an outline delimiter, so verse references remain intact.
 */
function outline(line: string): {
  marker: string;
  text: string;
  style: ListBlock["style"];
  rank: number;
} | null {
  const patterns: {
    pattern: RegExp;
    style: ListBlock["style"];
    rank: number;
  }[] = [
    { pattern: /^([IVXLCDM]+[.)])\s+(.+)$/, style: "roman", rank: 0 },
    { pattern: /^(\d{1,3}[.)])\s+(.+)$/, style: "decimal", rank: 1 },
    { pattern: /^(\(\d{1,3}\.?\))\s+(.+)$/, style: "parenthesized", rank: 2 },
    { pattern: /^(\[\d{1,3}\.?\])\s+(.+)$/, style: "bracketed", rank: 3 },
    { pattern: /^([a-z][.)])\s+(.+)$/, style: "letter", rank: 4 },
    { pattern: /^([-*\u2022])\s+(.+)$/, style: "bullet", rank: 5 },
  ];
  for (const { pattern, style, rank } of patterns) {
    const match = line.match(pattern);
    if (match) return { marker: match[1], text: match[2], style, rank };
  }
  return null;
}

/** Convert existing line breaks and explicit outlines into readable blocks.
 * Inline dotted parenthesized/bracketed markers are unambiguous subpoints in
 * these commentaries. Plain `(a)` footnotes, `[1]` references, Bible citations,
 * decimal numbers, abbreviations and ordinary sentence punctuation stay prose.
 * Missing list indexes remain missing: the renderer must not renumber them.
 * Lists follow the author's hierarchy; a blank line closes the current list.
 */
export function parseCommentaryText(text: string): CommentaryTextBlock[] {
  const blocks: CommentaryTextBlock[] = [];
  const stack: { rank: number; list: ListBlock }[] = [];
  const lines = text
    .replace(/\r\n?/g, "\n")
    .replace(/(\S)[^\S\n]+(?=(?:\(\d{1,3}\.\)|\[\d{1,3}\.\])\s)/g, "$1\n")
    .split("\n");

  for (const sourceLine of lines) {
    const line = sourceLine.trim();
    if (!line) {
      stack.length = 0;
      continue;
    }
    const item = outline(line);
    if (!item) {
      const parent = stack.at(-1)?.list.items.at(-1)?.blocks ?? blocks;
      parent.push({ type: "paragraph", text: line });
      continue;
    }

    while (stack.length && stack[stack.length - 1].rank > item.rank)
      stack.pop();
    let current = stack.at(-1);
    if (
      !current ||
      current.rank !== item.rank ||
      current.list.style !== item.style
    ) {
      const list: ListBlock = { type: "list", style: item.style, items: [] };
      const parent = current?.list.items.at(-1)?.blocks ?? blocks;
      parent.push(list);
      current = { rank: item.rank, list };
      stack.push(current);
    }
    current.list.items.push({
      marker: item.marker,
      blocks: [{ type: "paragraph", text: item.text }],
    });
  }
  return blocks;
}
