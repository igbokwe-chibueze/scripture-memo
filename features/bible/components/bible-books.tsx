"use client";

/** Native disclosures make all 66 books and chapter grids keyboard/touch accessible. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import { BibleArtPlaceholder } from "./bible-art-placeholder";
import type { BibleReference } from "../schemas/bible.schema";

/** Book search is local metadata filtering and causes no network/database requests. */
export function BibleBooks({
  testament,
  reference,
  onOpen,
  onBack,
}: {
  testament: "old" | "new";
  reference: BibleReference;
  onOpen: (reference: BibleReference) => void;
  onBack: () => void;
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
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack}>
        {t("backBibleHome")}
      </Button>
      <h1 className="font-heading text-4xl">{t(testament)}</h1>
      <p className="text-muted-foreground">
        {t("bookCount", { count: testament === "old" ? 39 : 27 })}
      </p>
      <BibleArtPlaceholder className="min-h-36" />
      <Input
        aria-label={t("searchBooks")}
        placeholder={t("searchBooks")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-h-12"
      />
      {!books.length && <p>{t("noResults")}</p>}
      {groups.map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="font-heading text-2xl">{t(`groups.${group}`)}</h2>
          {books
            .filter((book) => book.group === group)
            .map((book) => (
              <details
                key={book.id}
                className="rounded-card border border-border bg-card p-3"
              >
                <summary className="min-h-14 cursor-pointer py-2">
                  <span className="font-heading text-xl">{book.name}</span>
                  <span className="ml-3 text-sm text-muted-foreground">
                    {t("chapterCount", { count: book.chapters.length })}
                  </span>
                </summary>
                <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
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
              </details>
            ))}
        </section>
      ))}
    </div>
  );
}
