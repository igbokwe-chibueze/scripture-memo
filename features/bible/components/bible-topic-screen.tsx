"use client";

/** Topic detail uses the same in-workspace navigation as books and plans.
 * References are approved static data; only opening a passage loads scripture. */
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BIBLE_BOOKS, BIBLE_TOPICS } from "../data/bible-catalog";
import { BibleBookThumbnail } from "./bible-book-thumbnail";
import { bibleReferenceLabel } from "../lib/bible-reference";
import type { BibleReference } from "../schemas/bible.schema";
import type { BibleTopic } from "./bible-topic-carousel";

/** Retain the topic's existing passage choices without a modal or inner scroll. */
export function BibleTopicScreen({
  topic,
  translation,
  onOpen,
}: {
  topic: BibleTopic;
  translation: BibleReference["translation"];
  onOpen: (reference: BibleReference) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const index = BIBLE_TOPICS.findIndex((item) => item.id === topic.id);
  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-heading text-4xl sm:text-5xl">
        {t(`topics.${topic.id}`)}
      </h1>
      <p className="text-muted-foreground">
        {t(`topicDescriptions.${topic.id}`)}
      </p>
      <div className="relative aspect-[2/1] overflow-hidden rounded-card sm:aspect-[3/1]">
        <Image
          src={`/images/bible/topic-${index % 2 === 0 ? "traveller" : "sheep"}.png`}
          alt=""
          fill
          sizes="(min-width:1024px) 896px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-3">
        {topic.passages.map((passage) => {
          const book = BIBLE_BOOKS.find((item) => item.id === passage.book);
          if (!book) return null;
          return (
            <Button
              key={`${passage.book}:${passage.chapter}:${passage.verse}`}
              variant="outline"
              className="h-auto min-h-20 w-full justify-start gap-3 rounded-card border border-border bg-card p-2 text-left whitespace-normal shadow-sm"
              onClick={() => onOpen({ ...passage, translation })}
            >
              <BibleBookThumbnail
                bookId={book.id}
                group={book.group}
                testament={book.testament === "old" ? "old" : "new"}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-xl">
                  {bibleReferenceLabel(passage)}
                </span>
                <span className="block text-sm font-medium text-primary">
                  {t(`bookSubtitles.${book.id}`)}
                </span>
                <span className="block text-sm font-medium text-muted-foreground">
                  {translation}
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className="mr-2 size-6 shrink-0 text-primary"
              />
            </Button>
          );
        })}
      </div>
    </section>
  );
}
