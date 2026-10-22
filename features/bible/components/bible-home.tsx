"use client";

/** Bible discovery stays separate from game progression; opening a passage awards nothing. */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BibleIllustratedCard } from "./bible-illustrated-card";
import { BiblePassagePicker } from "./bible-passage-picker";
import { BIBLE_TOPICS } from "../data/bible-catalog";
import { bibleReferenceLabel } from "../lib/bible-reference";
import type { BibleReference } from "../schemas/bible.schema";

/** Topic rotation pauses on hover/focus, hidden documents and reduced motion. */
export function BibleHome({
  reference,
  onOpen,
  onBooks,
}: {
  reference: BibleReference;
  onOpen: (reference: BibleReference) => void;
  onBooks: (testament: "old" | "new") => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const reduced = useReducedMotion();
  const [topic, setTopic] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [allTopics, setAllTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<
    (typeof BIBLE_TOPICS)[number] | null
  >(null);
  const topicTrack = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Newly selected/rotated cards start at the leading edge even after a
    // manual swipe. Native scrolling still reveals every topic without JS gestures.
    topicTrack.current?.scrollTo({ left: 0, behavior: "instant" });
  }, [topic]);
  useEffect(() => {
    if (hovered || focused || reduced || allTopics || selectedTopic) return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setTopic((value) => (value + 1) % BIBLE_TOPICS.length);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [hovered, focused, reduced, allTopics, selectedTopic]);

  // Rotating real cards rather than duplicate hidden links keeps the next-card
  // preview clickable and avoids inaccessible copies of the same focus target.
  const visibleTopics = allTopics
    ? BIBLE_TOPICS
    : [...BIBLE_TOPICS.slice(topic), ...BIBLE_TOPICS.slice(0, topic)];
  return (
    <div className="bible-home mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section className="bible-home-hero relative grid grid-cols-[1.1fr_0.9fr] items-center sm:min-h-56">
        <div className="relative z-10 py-4">
          <h1 className="font-heading text-4xl font-bold leading-none sm:text-6xl">
            {t("discover")}{" "}
            <span className="block text-primary">{t("theWord")}</span>
          </h1>
          <p className="mt-2 text-base font-medium text-muted-foreground sm:text-xl">
            {t("tagline")}
          </p>
        </div>
        <div className="pointer-events-none relative -ml-5 aspect-square min-w-0 sm:-ml-8 sm:aspect-auto sm:h-60">
          <Image
            src="/images/bible/home-bible.png"
            alt=""
            fill
            sizes="(min-width: 1024px) 480px, 55vw"
            className="object-contain"
            loading="eager"
          />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-bold">{t("bibleBooks")}</h2>
        {/* A near-square frame reveals more of the square originals. Object-cover
            preserves their proportions while the two cards remain side by side. */}
        <div className="grid grid-cols-2 gap-3">
          {(["old", "new"] as const).map((part) => (
            <BibleIllustratedCard
              key={part}
              title={t(part)}
              subtitle={t("bookCount", { count: part === "old" ? 39 : 27 })}
              src={`/images/bible/${part}-testament.png`}
              imagePosition="center 58%"
              onClick={() => onBooks(part)}
              className="aspect-[1.125]"
              compactTitle
            />
          ))}
        </div>
      </section>
      <details className="group rounded-card border border-border bg-card p-4 shadow-sm sm:p-5">
        <summary className="mb-2 flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-heading text-2xl font-bold [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block">{t("goToVerse")}</span>
            {/* The workspace reference is the last opened passage, not an
                unsubmitted picker draft. Keep it visible when collapsed. */}
            <span className="mt-1 block text-sm font-medium text-primary">
              {bibleReferenceLabel(reference)} · {reference.translation}
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className="size-6 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <BiblePassagePicker reference={reference} onOpen={onOpen} compact />
      </details>
      <section
        className="space-y-3"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(false);
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold">
            {t("topicsTitle")}
          </h2>
          <Button variant="ghost" onClick={() => setAllTopics(!allTopics)}>
            {t(allTopics ? "showLess" : "viewAll")}
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
        <div
          ref={topicTrack}
          className={
            allTopics
              ? "grid gap-3 sm:grid-cols-2"
              : "bible-topic-track flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
          }
          aria-label={t("topicsTitle")}
        >
          {visibleTopics.map((item) => {
            const originalIndex = BIBLE_TOPICS.findIndex(
              (entry) => entry.id === item.id,
            );
            return (
              <BibleIllustratedCard
                key={item.id}
                title={t(`topics.${item.id}`)}
                subtitle={t(`topicDescriptions.${item.id}`)}
                src={`/images/bible/topic-${originalIndex % 2 === 0 ? "traveller" : "sheep"}.png`}
                sizes="(min-width: 1024px) 440px, (min-width: 640px) 45vw, calc(100vw - 2rem)"
                imagePosition={
                  originalIndex % 2 === 0 ? "center 12%" : "center 100%"
                }
                onClick={() => setSelectedTopic(item)}
                className={
                  allTopics
                    ? "aspect-[2.1]"
                    : "aspect-[2.1] basis-[calc(100%-2.5rem)] snap-start sm:basis-[calc(50%-0.375rem)]"
                }
              />
            );
          })}
        </div>
        {!allTopics && (
          <div className="flex min-h-11 items-center justify-center gap-0">
            {BIBLE_TOPICS.map((item, index) => (
              <Button
                key={item.id}
                size="icon"
                variant="ghost"
                aria-label={t(`topics.${item.id}`)}
                aria-pressed={index === topic}
                onClick={() => setTopic(index)}
                className="px-2"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 rounded-full ${index === topic ? "w-7 bg-primary" : "w-2 bg-muted-foreground/40"}`}
                />
              </Button>
            ))}
          </div>
        )}
      </section>
      <Dialog
        open={selectedTopic !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTopic(null);
        }}
      >
        <DialogContent className="bible-dialog sm:max-w-lg">
          <DialogTitle className="pr-14 font-heading text-2xl font-bold">
            {selectedTopic ? t(`topics.${selectedTopic.id}`) : t("topicsTitle")}
          </DialogTitle>
          <DialogDescription>
            {selectedTopic ? t(`topicDescriptions.${selectedTopic.id}`) : ""}
          </DialogDescription>
          <div className="space-y-3">
            {selectedTopic?.passages.map((passage) => (
              <Button
                key={`${passage.book}:${passage.chapter}:${passage.verse}`}
                variant="secondary"
                className="w-full justify-between"
                onClick={() => {
                  setSelectedTopic(null);
                  onOpen({ ...passage, translation: reference.translation });
                }}
              >
                {bibleReferenceLabel(passage)}
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
