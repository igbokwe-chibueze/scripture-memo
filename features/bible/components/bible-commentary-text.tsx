"use client";

import { useMemo } from "react";
import {
  parseCommentaryText,
  type CommentaryTextBlock,
} from "../lib/parse-commentary-text";

/** Render semantic paragraphs and nested outlines with the source's exact
 * markers. React escapes every string; provider HTML is never interpreted.
 * Grid keeps wrapped lines aligned with their text rather than the index.
 */
function CommentaryBlocks({
  blocks,
}: {
  blocks: CommentaryTextBlock[];
}): React.ReactNode {
  return blocks.map((block, index) => {
    if (block.type === "paragraph") return <p key={index}>{block.text}</p>;
    const List = block.style === "bullet" ? "ul" : "ol";
    return (
      <List key={index} role="list" className="list-none space-y-5">
        {block.items.map((item, itemIndex) => (
          <li
            key={itemIndex}
            className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-2 sm:gap-x-3"
          >
            <span className="font-bold tabular-nums text-primary">
              {item.marker}
            </span>
            <div className="min-w-0 space-y-4">
              <CommentaryBlocks blocks={item.blocks} />
            </div>
          </li>
        ))}
      </List>
    );
  });
}

/** Parse once per source string; annotation/UI renders do not repeatedly parse
 * a long chapter. Content stays in normal page flow without inner scrolling.
 */
export function BibleCommentaryText({
  text,
}: {
  text: string;
}): React.ReactNode {
  const blocks = useMemo(() => parseCommentaryText(text), [text]);
  return (
    <div className="min-w-0 max-w-prose space-y-5 break-words leading-[1.85]">
      <CommentaryBlocks blocks={blocks} />
    </div>
  );
}
