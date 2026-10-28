"use client";

/** Topic detail uses the same in-workspace navigation as books and plans.
 * References are approved static data; only opening a passage loads scripture. */
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import { bibleTopicColour } from "../lib/bible-topic-colour";
import { BibleTopicTexture } from "./bible-topic-texture";
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
  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div
        style={bibleTopicColour(topic.id)}
        className="relative isolate flex min-h-44 flex-col justify-center gap-3 overflow-hidden rounded-card p-5 sm:min-h-56 sm:p-7"
      >
        <BibleTopicTexture topicId={topic.id} />
        <h1 className="relative z-10 font-heading text-4xl sm:text-5xl">
          {t(`topics.${topic.id}`)}
        </h1>
        <p className="relative z-10">{t(`topicDescriptions.${topic.id}`)}</p>
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
