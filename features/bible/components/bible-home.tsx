"use client";

/** Bible discovery stays separate from game progression; opening a passage awards nothing. */
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BibleArtPlaceholder } from "./bible-art-placeholder";
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
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [allTopics, setAllTopics] = useState(false);
  useEffect(() => {
    if (paused || hovered || focused || reduced || allTopics) return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setTopic((value) => (value + 1) % BIBLE_TOPICS.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, reduced, allTopics]);
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center gap-3 sm:grid-cols-2 sm:gap-4">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl">
            {t("discover")} <span className="text-primary">{t("theWord")}</span>
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{t("tagline")}</p>
        </div>
        <BibleArtPlaceholder className="min-h-36" />
      </section>
      <section className="space-y-3">
        <h2 className="font-heading text-2xl">{t("bibleBooks")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {(["old", "new"] as const).map((part) => (
            <div
              key={part}
              className="space-y-3 rounded-card border border-border bg-card p-3"
            >
              <BibleArtPlaceholder />
              <Button
                onClick={() => onBooks(part)}
                variant="secondary"
                className="h-auto w-full flex-col gap-0 py-3"
              >
                <span>{t(part)}</span>
                <span className="text-xs">
                  {t("bookCount", { count: part === "old" ? 39 : 27 })}
                </span>
              </Button>
            </div>
          ))}
        </div>
      </section>
      <details open className="rounded-card border border-border bg-card p-4">
        <summary className="min-h-11 cursor-pointer font-heading text-2xl">
          {t("goToVerse")}
        </summary>
        <BiblePassagePicker reference={reference} onOpen={onOpen} />
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
          <h2 className="font-heading text-2xl">{t("topicsTitle")}</h2>
          <Button variant="ghost" onClick={() => setAllTopics(!allTopics)}>
            {t(allTopics ? "showLess" : "viewAll")}
          </Button>
        </div>
        {(allTopics ? BIBLE_TOPICS : [BIBLE_TOPICS[topic]]).map((item) => (
          <article
            key={item.id}
            className="space-y-3 rounded-card border border-border bg-card p-4"
          >
            <BibleArtPlaceholder />
            <h3 className="font-heading text-2xl">{t(`topics.${item.id}`)}</h3>
            <div className="flex flex-wrap gap-2">
              {item.passages.map((passage) => (
                <Button
                  key={`${passage.book}:${passage.chapter}:${passage.verse}`}
                  variant="secondary"
                  onClick={() =>
                    onOpen({ ...passage, translation: reference.translation })
                  }
                >
                  {bibleReferenceLabel(passage)}
                </Button>
              ))}
            </div>
          </article>
        ))}
        {!allTopics && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {BIBLE_TOPICS.map((item, index) => (
              <Button
                key={item.id}
                size="icon"
                variant={index === topic ? "default" : "ghost"}
                aria-label={t(`topics.${item.id}`)}
                aria-pressed={index === topic}
                onClick={() => setTopic(index)}
              >
                {index + 1}
              </Button>
            ))}
            <Button variant="ghost" onClick={() => setPaused(!paused)}>
              {t(paused ? "resume" : "pause")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
