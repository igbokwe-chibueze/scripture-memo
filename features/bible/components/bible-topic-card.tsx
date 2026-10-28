"use client";

/** Textured colour topic identity replaces illustrations for Explore Scripture.
 * Keep the shared game button, card dimensions and existing navigation behavior. */
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bibleTopicColour } from "../lib/bible-topic-colour";
import { BibleTopicTexture } from "./bible-topic-texture";

/** ID-based colours stay identical across loop copies, refreshes and View all. */
export function BibleTopicCard({
  topicId,
  onOpen,
}: {
  topicId: string;
  onOpen: () => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  return (
    <Button
      variant="outline"
      onClick={onOpen}
      style={bibleTopicColour(topicId)}
      data-bible-topic-card={topicId}
      className="relative isolate flex aspect-[1.125] h-auto w-full flex-col items-start justify-center gap-2 overflow-hidden rounded-card px-3 py-4 text-left whitespace-normal sm:px-4"
    >
      <BibleTopicTexture topicId={topicId} />
      <span className="relative z-10 block font-heading text-lg font-bold leading-tight sm:text-2xl">
        {t(`topics.${topicId}`)}
      </span>
      <span className="relative z-10 block text-xs font-medium leading-snug sm:text-sm">
        {t(`topicDescriptions.${topicId}`)}
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="absolute bottom-2 right-2 z-10 size-4 sm:size-5"
      />
    </Button>
  );
}
