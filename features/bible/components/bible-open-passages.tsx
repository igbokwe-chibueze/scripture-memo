"use client";

/** Open passages share one row design in the scroll strip and vertical drawer.
 * All state is local; opening/closing a tab delegates to the reader workspace
 * and never reads private data or writes to the database.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ListIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { bibleReferenceLabel } from "../lib/bible-reference";
import type { BibleReference } from "../schemas/bible.schema";

/** Active and inactive passages differ only in semantic surface/text colors. */
function PassageRow({
  passage,
  active,
  last,
  onOpen,
  onClose,
}: {
  passage: BibleReference;
  active: boolean;
  last: boolean;
  onOpen: () => void;
  onClose: () => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const label = bibleReferenceLabel({ ...passage, verse: undefined });
  return (
    <div
      data-active-passage={active ? "true" : undefined}
      className={`flex shrink-0 items-center rounded-control border ${
        active
          ? "border-selection-border bg-selection-subtle text-selection-text"
          : "border-border bg-card text-foreground"
      }`}
    >
      <Button
        variant="ghost"
        className="min-h-11 flex-1 justify-start px-3 text-sm text-inherit"
        aria-current={active ? "page" : undefined}
        onClick={onOpen}
      >
        {label} · {passage.translation}
      </Button>
      <Button
        size="icon-lg"
        variant="ghost"
        className="size-11 text-inherit"
        aria-label={t("closeChapter", { reference: label })}
        disabled={last}
        onClick={onClose}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

/** Keep the list button visible while the passage strip scrolls horizontally. */
export function BibleOpenPassages({
  reference,
  tabs,
  onOpen,
  onCloseTab,
}: {
  reference: BibleReference;
  tabs: BibleReference[];
  onOpen: (reference: BibleReference) => void;
  onCloseTab: (index: number) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [open, setOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotionPreference();

  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>(
      '[data-active-passage="true"]',
    );
    if (!strip || !active) return;
    const bounds = strip.getBoundingClientRect();
    const tab = active.getBoundingClientRect();
    const delta =
      tab.left < bounds.left
        ? tab.left - bounds.left
        : tab.right > bounds.right
          ? tab.right - bounds.right
          : 0;
    // Scroll this strip only. scrollIntoView would also move the reading page.
    if (delta) {
      strip.scrollTo({
        left: strip.scrollLeft + delta,
        behavior: reduceMotion ? "instant" : "smooth",
      });
    }
  }, [
    reference.book,
    reference.chapter,
    reference.translation,
    tabs.length,
    reduceMotion,
  ]);

  function rows(inDrawer: boolean): React.ReactNode {
    return tabs.map((passage, index) => (
      <PassageRow
        key={`${passage.book}:${passage.chapter}:${passage.translation}`}
        passage={passage}
        active={
          passage.book === reference.book &&
          passage.chapter === reference.chapter &&
          passage.translation === reference.translation
        }
        last={tabs.length === 1}
        onOpen={() => {
          if (inDrawer) setOpen(false);
          onOpen(passage);
        }}
        onClose={() => onCloseTab(index)}
      />
    ));
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        ref={stripRef}
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto overscroll-x-contain py-2"
        aria-label={t("openChapters")}
      >
        {rows(false)}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon-lg"
              className="size-11 shrink-0"
              aria-label={t("openChapters")}
            />
          }
        >
          <ListIcon aria-hidden="true" />
        </SheetTrigger>
        <SheetContent
          side="right"
          className="bible-dialog w-[min(100%,24rem)] overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-0 pr-14">
            <SheetTitle className="text-2xl">{t("openChapters")}</SheetTitle>
            <SheetDescription>{t("openPassagesHelp")}</SheetDescription>
          </SheetHeader>
          <div className="flex min-w-0 flex-col gap-3">{rows(true)}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
