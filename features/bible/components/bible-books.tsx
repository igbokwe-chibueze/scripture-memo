"use client";

/** Native disclosures make all 66 books and chapter grids keyboard/touch accessible. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import { BibleBookThumbnail } from "./bible-book-thumbnail";
import { BibleGroupHelp } from "./bible-group-help";
import type { BibleReference } from "../schemas/bible.schema";

/** Book search is local metadata filtering and causes no network/database requests. */
export function BibleBooks({
  testament,
  reference,
  onOpen,
}: {
  testament: "old" | "new";
  reference: BibleReference;
  onOpen: (reference: BibleReference) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [query, setQuery] = useState("");
  const books = BIBLE_BOOKS.filter(
    (book) =>
      book.testament === testament &&
      book.name.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = [...new Set(books.map((book) => book.group))];
  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
      <div className="space-y-1">
        <h1 className="font-heading text-4xl leading-tight sm:text-5xl">
          {t(testament)}
        </h1>
        <p className="font-medium text-muted-foreground sm:text-lg">
          {t("bookCount", { count: testament === "old" ? 39 : 27 })} ·{" "}
          {t(testament === "old" ? "oldDescription" : "newDescription")}
        </p>
      </div>
      {/* The square original scales proportionally into a wide header; the
          group thumbnails below reveal each category's supplied illustration. */}
      <div className="relative aspect-[2.2] overflow-hidden rounded-card sm:aspect-[2.5]">
        <Image
          src={`/images/bible/${testament}-testament.png`}
          alt=""
          fill
          sizes="(min-width: 1024px) 896px, 100vw"
          className="object-cover object-center"
          loading="eager"
        />
      </div>
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label={t("searchTestamentBooks", { testament: t(testament) })}
          placeholder={t("searchTestamentBooks", { testament: t(testament) })}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-12 rounded-control bg-muted/40 pl-12"
        />
      </div>
      {!books.length && <p>{t("noResults")}</p>}
      {groups.map((group) => (
        <section key={group} className="space-y-2">
          <div>
            <div className="flex items-center gap-1">
              <h2 className="font-heading text-2xl">{t(`groups.${group}`)}</h2>
              <BibleGroupHelp group={group} testament={testament} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("bookCount", {
                count: books.filter((book) => book.group === group).length,
              })}
            </p>
          </div>
          {books
            .filter((book) => book.group === group)
            .map((book) => (
              <details
                key={book.id}
                className="group/book rounded-card border border-border bg-card p-2 shadow-sm"
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <BibleBookThumbnail
                    bookId={book.id}
                    group={group}
                    testament={testament}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-xl">
                      {book.name}
                    </span>
                    {/* Editorial themes describe each book for browsing; they
                        are interface copy, never additions to Scripture text. */}
                    <span className="block text-sm font-medium text-primary">
                      {t(`bookSubtitles.${book.id}`)}
                    </span>
                    <span className="block text-sm font-medium text-muted-foreground">
                      {t("chapterCount", { count: book.chapters.length })}
                    </span>
                  </span>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="mr-2 size-6 shrink-0 text-primary transition-transform group-open/book:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <div className="mt-2 pt-3">
                  <p className="mb-2 text-sm font-medium">{t("chapters")}</p>
                  {/* Five columns at 375px preserve 44px targets. Larger screens
                      progressively reveal more columns without shrinking taps. */}
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
                    {book.chapters.map((_, index) => (
                      <Button
                        key={index}
                        aria-label={`${book.name} ${index + 1}`}
                        variant={
                          reference.book === book.id &&
                          reference.chapter === index + 1
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          onOpen({
                            book: book.id,
                            chapter: index + 1,
                            verse: 1,
                            translation: reference.translation,
                          })
                        }
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              </details>
            ))}
        </section>
      ))}
    </div>
  );
}
