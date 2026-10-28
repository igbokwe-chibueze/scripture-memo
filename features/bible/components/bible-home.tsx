"use client";

/** Bible discovery stays separate from game progression; opening a passage awards nothing. */
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ChevronDownIcon } from "lucide-react";
import { BibleIllustratedCard } from "./bible-illustrated-card";
import { BiblePassagePicker } from "./bible-passage-picker";
import { BibleTopicCarousel, type BibleTopic } from "./bible-topic-carousel";
import { bibleReferenceLabel } from "../lib/bible-reference";
import type { BibleReference } from "../schemas/bible.schema";
import { BibleReadingPlanCard } from "./bible-reading-plan";
import type { ReadingPlanId } from "../data/reading-plan-catalog";

/** Topic rotation pauses on hover/focus, hidden documents and reduced motion. */
export function BibleHome({
  reference,
  onOpen,
  onBooks,
  onPlan,
  onTopic,
}: {
  reference: BibleReference;
  onOpen: (reference: BibleReference) => void;
  onBooks: (testament: "old" | "new") => void;
  onPlan: (planId: ReadingPlanId) => void;
  onTopic: (topic: BibleTopic) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
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
      {/* Keep the closed summary compact; expanded controls retain roomy padding. */}
      <details className="group rounded-card border border-border bg-card px-4 py-2 shadow-sm open:py-4 sm:px-5 sm:open:py-5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-heading text-xl font-bold group-open:mb-2 group-open:text-2xl [&::-webkit-details-marker]:hidden">
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
        <BiblePassagePicker
          key={`${reference.book}:${reference.chapter}:${reference.verse}:${reference.translation}`}
          reference={reference}
          onOpen={onOpen}
          compact
        />
      </details>
      <BibleReadingPlanCard onOpen={onPlan} />
      <BibleTopicCarousel onOpen={onTopic} />
    </div>
  );
}
