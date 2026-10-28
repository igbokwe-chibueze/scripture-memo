"use client";

/** Standalone Bible composition replaces game chrome only within /bible. */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  readBibleDevicePosition,
  parseBibleDevicePosition,
  saveBibleDevicePosition,
  subscribeBibleDevicePosition,
} from "../lib/bible-device-position";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { ArrowLeftIcon, BookmarkIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Button } from "@/components/ui/button";
import { GameArtwork } from "@/components/shared/game-artwork";
import { PlayerAvatar } from "@/features/profile";
import { BibleHome } from "./bible-home";
import { BibleTopicScreen } from "./bible-topic-screen";
import type { BibleTopic } from "./bible-topic-carousel";
import { BibleBooks } from "./bible-books";
import { BibleReader } from "./bible-reader";
import { BibleLibrary } from "./bible-library";
import { BibleSearchDialog } from "./bible-search-dialog";
import {
  bibleReferenceUrl,
  bibleSelectionFromQuery,
} from "../lib/bible-reference";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import {
  bibleReferenceSchema,
  type BibleReference,
} from "../schemas/bible.schema";
import type { PlayerShellSummary } from "@/features/player-shell/types/player-shell.types";
import "./bible.css";
import { useBibleDockHeight } from "../hooks/use-bible-dock-height";
import { BibleReadingPlan } from "./bible-reading-plan";
import { useReadingPlanProgress } from "../hooks/use-reading-plan-progress";
import { BiblePlanReadingControls } from "./bible-plan-reading-controls";
import {
  READING_PLANS,
  type ReadingPlanId,
} from "../data/reading-plan-catalog";

/** Session tabs use canonical references; browser history supports deep links without extra private reads. */
export function BibleWorkspace({
  initialReference,
  translation,
  authors,
  player,
}: {
  initialReference: BibleReference | null;
  translation: BibleReference["translation"];
  authors: { id: string; name: string }[];
  player: PlayerShellSummary;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const plans = useTranslations("ReadingPlans");
  const [planId, setPlanId] = useState<ReadingPlanId>("new-testament");
  const plan = READING_PLANS[planId];
  const planProgress = useReadingPlanProgress(planId);
  const [planDay, setPlanDay] = useState<number | null>(null);
  const [planReadingDay, setPlanReadingDay] = useState<number | null>(null);
  const navigationRef = useBibleDockHeight("--bible-nav-height");
  // The server snapshot is null so hydration matches server HTML. After
  // hydration, browser storage supplies the last passage without a DB request.
  const storedPosition = useSyncExternalStore(
    subscribeBibleDevicePosition,
    readBibleDevicePosition,
    () => null,
  );
  const initial = initialReference ??
    parseBibleDevicePosition(storedPosition) ?? {
      book: "GEN",
      chapter: 1,
      verse: 1,
      translation,
    };
  const [openedReference, setReference] = useState<BibleReference | null>(null);
  const reference = openedReference ?? initial;
  const [tabs, setTabs] = useState<BibleReference[]>([]);
  const [screen, setScreen] = useState<
    "home" | "read" | "saved" | "books" | "plan" | "topic"
  >(initialReference ? "read" : "home");
  const [testament, setTestament] = useState<"old" | "new">("old");
  const [selectedTopic, setSelectedTopic] = useState<BibleTopic | null>(null);

  useEffect(() => {
    // Opening a shared/deep link is also an explicit passage choice. Merely
    // visiting Bible Home never writes a default over the stored reference.
    if (!initialReference) return;
    try {
      saveBibleDevicePosition(initialReference);
    } catch {
      toast.error(t("failed"));
    }
  }, [initialReference, t]);

  // Plan provenance is explicit, never inferred from a chapter or saved progress.
  // Ordinary reading defaults to no plan, even when that chapter belongs to one.
  function openPassage(
    value: BibleReference,
    readingDay: number | null = null,
  ): void {
    const parsed = bibleReferenceSchema.safeParse(value);
    if (!parsed.success) {
      toast.error(t("invalid"), { duration: Infinity });
      return;
    }
    setPlanReadingDay(readingDay);
    setReference(parsed.data);
    try {
      saveBibleDevicePosition(parsed.data);
    } catch {
      toast.error(t("failed"));
    }
    setTabs((current) => {
      const matching = current.findIndex(
        (item) =>
          item.book === value.book &&
          item.chapter === value.chapter &&
          item.translation === value.translation,
      );
      if (matching >= 0)
        return current.map((item, index) =>
          index === matching ? parsed.data : item,
        );
      // Eight open chapter tabs keep touch navigation bounded. Oldest tabs close first;
      // saved marks are independent and are never removed with a reading tab.
      return [...current.slice(-7), parsed.data];
    });
    setScreen("read");
    window.history.replaceState(null, "", bibleReferenceUrl(parsed.data));
  }

  useEffect(() => {
    function restore(): void {
      const params = new URLSearchParams(window.location.search);
      const parsed = bibleReferenceSchema.safeParse({
        book: params.get("book"),
        chapter: Number(params.get("chapter")),
        verse: Number(params.get("verse") ?? 1),
        translation: params.get("translation") ?? translation,
        selection: bibleSelectionFromQuery(params.get("selection")),
      });
      if (parsed.success) {
        setPlanReadingDay(null);
        setReference(parsed.data);
        setTabs([parsed.data]);
        setScreen("read");
      } else setScreen("home");
    }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [translation]);

  function navigate(value: "home" | "read" | "saved"): void {
    // The general navigation is a separate pathway from opening a plan day.
    setPlanReadingDay(null);
    setScreen(value);
    window.history.replaceState(
      null,
      "",
      value === "read" ? bibleReferenceUrl(reference) : "/bible",
    );
    window.scrollTo({ top: 0 });
  }

  // Only the explicitly opened day in the explicitly selected plan can be marked.
  // Matching a chapter in some other plan must never create completion controls.
  const activePlanDay =
    planReadingDay !== null &&
    plan.days[planReadingDay - 1]?.chapters.some(
      (chapter) =>
        chapter.book === reference.book &&
        chapter.chapter === reference.chapter,
    )
      ? planReadingDay
      : null;
  function returnToPlan(): void {
    setPlanDay(activePlanDay);
    setScreen("plan");
    window.history.replaceState(null, "", "/bible");
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="bible-workspace min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-[calc(var(--bible-nav-height,5rem)+var(--bible-audio-height,0px)+1.5rem)] sm:px-6">
        <header className="mb-5 flex items-center justify-between gap-3 border-b border-border py-4">
          <div className="flex items-center gap-2">
            <GameArtwork name="bibleOpen" className="size-12" sizes="48px" />
            <span className="font-heading text-3xl">{t("title")}</span>
          </div>
          <div className="flex items-center gap-3">
            <BibleSearchDialog
              translation={reference.translation}
              onOpen={openPassage}
            />
            <NavigationButton
              href="/profiles"
              pendingLabel={t("opening")}
              aria-label={t("profile")}
              variant="ghost"
              className="p-0"
            >
              <PlayerAvatar
                avatarKey={player.avatarKey ?? null}
                frameKey={player.avatarFrameKey ?? null}
                displayName={player.displayName ?? ""}
                size="md"
              />
            </NavigationButton>
          </div>
        </header>
        {screen === "home" ? (
          <NavigationButton
            href="/game"
            pendingLabel={t("opening")}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeftIcon aria-hidden="true" />
            {t("backGame")}
          </NavigationButton>
        ) : screen === "topic" ? (
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate("home")}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {plans("backHome")}
          </Button>
        ) : screen === "plan" ||
          (screen === "read" && activePlanDay !== null) ? (
          <Button
            variant="outline"
            className="mb-4 min-h-11"
            onClick={screen === "plan" ? () => navigate("home") : returnToPlan}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {plans(screen === "plan" ? "backHome" : "backPlan")}
          </Button>
        ) : (
          screen !== "books" && (
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => {
                // Return to the active passage's testament without another route
                // request. The existing books catalogue is entirely local UI.
                setTestament(
                  BIBLE_BOOKS.find((book) => book.id === reference.book)
                    ?.testament === "new"
                    ? "new"
                    : "old",
                );
                setScreen("books");
                window.scrollTo({ top: 0 });
              }}
            >
              <ArrowLeftIcon aria-hidden="true" />
              {t("backBooks")}
            </Button>
          )
        )}
        <main>
          {screen === "home" && (
            <BibleHome
              reference={reference}
              onOpen={openPassage}
              onTopic={(topic) => {
                setSelectedTopic(topic);
                setPlanReadingDay(null);
                setScreen("topic");
                window.history.replaceState(null, "", "/bible");
                window.scrollTo({ top: 0 });
              }}
              onPlan={(id) => {
                setPlanId(id);
                setPlanReadingDay(null);
                setPlanDay(null);
                setScreen("plan");
                window.history.replaceState(null, "", "/bible");
                window.scrollTo({ top: 0 });
              }}
              onBooks={(value) => {
                setTestament(value);
                setScreen("books");
                window.scrollTo({ top: 0 });
              }}
            />
          )}
          {screen === "books" && (
            <BibleBooks
              key={testament}
              testament={testament}
              reference={reference}
              onOpen={openPassage}
            />
          )}
          {screen === "topic" && selectedTopic && (
            <BibleTopicScreen
              topic={selectedTopic}
              translation={reference.translation}
              onOpen={openPassage}
            />
          )}
          {screen === "plan" && (
            <BibleReadingPlan
              key={planId}
              planId={planId}
              initialDay={planDay}
              onRead={(chapter, day) => {
                openPassage(
                  {
                    ...chapter,
                    verse: 1,
                    translation: reference.translation,
                  },
                  day,
                );
                window.scrollTo({ top: 0 });
              }}
            />
          )}
          {screen === "read" && activePlanDay !== null && (
            <BiblePlanReadingControls
              planId={planId}
              dayNumber={activePlanDay}
              reference={reference}
              progress={planProgress}
              onOpen={(value) => openPassage(value, activePlanDay)}
            />
          )}
          {screen === "read" && (
            <BibleReader
              reference={reference}
              tabs={tabs.length ? tabs : [reference]}
              authors={authors}
              onOpen={(value) => {
                // Selecting a verse or changing translation stays in the same
                // plan chapter. Opening a different passage leaves that pathway.
                const sameChapter =
                  value.book === reference.book &&
                  value.chapter === reference.chapter;
                openPassage(value, sameChapter ? activePlanDay : null);
              }}
              onCloseTab={(index) => {
                const remaining = tabs.filter(
                  (_, itemIndex) => itemIndex !== index,
                );
                setTabs(remaining);
                if (
                  remaining.length &&
                  tabs[index].book === reference.book &&
                  tabs[index].chapter === reference.chapter &&
                  tabs[index].translation === reference.translation
                )
                  openPassage(remaining[remaining.length - 1]);
              }}
            />
          )}
          {screen === "saved" && <BibleLibrary onOpen={openPassage} />}
        </main>
      </div>
      <nav
        ref={navigationRef}
        className="bible-bottom-navigation"
        aria-label={t("navigation")}
      >
        {(
          [
            { id: "home", artwork: "home" },
            { id: "read", artwork: "bibleOpen" },
            { id: "saved", artwork: null },
          ] as const
        ).map(({ id, artwork }) => (
          <Button
            key={id}
            variant="ghost"
            aria-current={
              screen === id ||
              (id === "home" &&
                (screen === "books" || screen === "plan" || screen === "topic"))
                ? "page"
                : undefined
            }
            onClick={() => navigate(id)}
            className="bible-navigation-item"
          >
            {artwork ? (
              <GameArtwork name={artwork} className="size-9" sizes="36px" />
            ) : (
              <BookmarkIcon
                aria-hidden="true"
                className="size-9 text-primary"
              />
            )}
            <span>{t(id)}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}
