/** Shared approved category artwork and abbreviation for book/passage rows.
 * Decorative thumbnail duplicates the adjacent reference and needs no alt text. */
import Image from "next/image";
import { bibleGroupArtwork } from "../data/bible-group-artwork";
import { BIBLE_BOOK_ABBREVIATIONS } from "../data/bible-book-abbreviations";

/** Identical size, light abbreviation scrim and crop across browsing surfaces. */
export function BibleBookThumbnail({
  bookId,
  group,
  testament,
}: {
  bookId: string;
  group: string;
  testament: "old" | "new";
}): React.ReactNode {
  return (
    <span className="relative size-16 shrink-0 sm:size-18">
      <Image
        src={bibleGroupArtwork(group, testament)}
        alt=""
        width={72}
        height={72}
        sizes="72px"
        className="size-full rounded-control object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center rounded-control bg-[color-mix(in_srgb,var(--image-overlay)_20%,transparent)] font-heading text-3xl leading-none text-image-foreground [text-shadow:0_2px_4px_var(--image-overlay)] sm:text-4xl"
      >
        {BIBLE_BOOK_ABBREVIATIONS[bookId]}
      </span>
    </span>
  );
}
