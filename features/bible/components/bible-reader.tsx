"use client";

/** Chapter reader owns loading and annotation state; the provider never controls markup or HTML. */
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "framer-motion";
import { toast } from "@/lib/toast";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { BiblePassageActions } from "./bible-passage-actions";
import { BibleOpenPassages } from "./bible-open-passages";
import { LoadingButton } from "@/components/shared/loading-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { showActionError } from "@/lib/errors/show-action-error";
import {
  readBibleChapterAction,
  setBibleMarkAction,
} from "../actions/bible-reader.action";
import {
  adjacentBibleChapter,
  bibleReferenceLabel,
  bibleReferenceUrl,
} from "../lib/bible-reference";
import { BiblePassagePicker } from "./bible-passage-picker";
import { BibleStudyPanel } from "./bible-study-panel";
import { BibleAudioPlayer } from "./bible-audio-player";
import type { BibleReference } from "../schemas/bible.schema";
import { useBibleResource } from "../hooks/use-bible-resource";
import { pulseBibleSelection } from "../lib/bible-selection-haptic";

/** Reader tabs stay session-local; only deliberate bookmark/highlight actions write to PostgreSQL. */
export function BibleReader({
  reference,
  tabs,
  authors,
  onOpen,
  onCloseTab,
}: {
  reference: BibleReference;
  tabs: BibleReference[];
  authors: { id: string; name: string }[];
  onOpen: (reference: BibleReference) => void;
  onCloseTab: (index: number) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const desktop = useMediaQuery("(min-width: 1024px)");
  // Preserve the chosen commentary across lazy mobile panels and viewport changes.
  const [commentaryAuthor, setCommentaryAuthor] = useState("matthew-henry");
  const [desktopStudyTab, setDesktopStudyTab] = useState<
    "words" | "commentary" | "crossReferences"
  >("words");
  const [mobileTab, setMobileTab] = useState<
    "passage" | "words" | "commentary" | "crossReferences"
  >("passage");
  const showingCommentary = desktop
    ? desktopStudyTab === "commentary"
    : mobileTab === "commentary";
  const { book, chapter: chapterNumber, translation } = reference;
  // Verse selection does not reload an already-loaded chapter or its annotations.
  const load = useCallback(
    () =>
      readBibleChapterAction({
        book,
        chapter: chapterNumber,
        translation,
        verse: 1,
      }),
    [book, chapterNumber, translation],
  );
  const { data, loading, failed, retry, updateData } = useBibleResource(
    `${book}:${chapterNumber}:${translation}`,
    load,
  );
  const chapter = data?.chapter ?? null;
  const marks = data?.marks ?? [];
  const [picker, setPicker] = useState(false);
  const [settings, setSettings] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [fontSize, setFontSize] = useState(21);
  const [shareText, setShareText] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Opening a chapter supplies a reading position, not permission to expose
  // verse actions. Only a deliberate long press or desktop action opens them.
  const [activeVerse, setActiveVerse] = useState<string | null>(null);
  const [verseDialog, setVerseDialog] = useState<string | null>(null);
  const verseActionsRef = useRef<HTMLDivElement>(null);
  const revealedPassage = useRef<string | null>(null);
  const longPressCompleted = useRef(false);
  const press = useRef<{
    timer: ReturnType<typeof setTimeout>;
    x: number;
    y: number;
  } | null>(null);
  const verseKey = (number: number): string =>
    `${book}:${chapterNumber}:${translation}:${number}`;

  function cancelPress(): void {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  }

  useEffect(() => cancelPress, [book, chapterNumber, translation, desktop]);
  // Drafts are keyed by chapter/edition and incoming linked selection. Ordinary
  // taps in selection mode change only this client draft, not URL, storage or DB.
  const selectionKey = `${book}:${chapterNumber}:${translation}:${JSON.stringify(reference.selection ?? null)}`;
  const [draft, setDraft] = useState<{
    key: string;
    verses: number[];
    active: boolean;
  } | null>(null);
  const currentDraft = draft?.key === selectionKey ? draft : null;
  const selecting = currentDraft?.active ?? Boolean(reference.selection);
  const chosen = (
    currentDraft?.verses ??
    (reference.selection === "chapter"
      ? (chapter?.verses.map((verse) => verse.number) ?? [])
      : (reference.selection ?? []))
  ).filter((number) =>
    chapter?.verses.some((verse) => verse.number === number),
  );
  useEffect(() => {
    if (!activeVerse || selecting || verseDialog === activeVerse) return;

    // Capture runs before another verse's action handler, so clicking a new
    // action can replace the selection without this listener clearing it later.
    function dismissOutside(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          '[data-bible-active-verse="true"], [data-bible-verse-actions]',
        )
      )
        return;
      setActiveVerse(null);
      setVerseDialog(null);
    }

    document.addEventListener("click", dismissOutside, true);
    return () => document.removeEventListener("click", dismissOutside, true);
  }, [activeVerse, selecting, verseDialog]);
  function pickVerse(number: number, feedback = true): void {
    // Keep hardware effects outside state updaters, which React may replay.
    // Deselection stays quiet; only newly selected verses receive a pulse.
    if (
      feedback &&
      (selecting ? !chosen.includes(number) : activeVerse !== verseKey(number))
    ) {
      pulseBibleSelection();
    }
    if (!selecting) {
      setActiveVerse(verseKey(number));
      onOpen({ ...reference, verse: number, selection: undefined });
      return;
    }
    // Functional updates preserve every tap even when React batches rapid picks.
    setDraft((current) => {
      const values = current?.key === selectionKey ? current.verses : chosen;
      return {
        key: selectionKey,
        active: true,
        verses: values.includes(number)
          ? values.filter((verse) => verse !== number)
          : [...values, number].sort((a, b) => a - b),
      };
    });
  }
  useEffect(() => {
    if (loading || (!desktop && mobileTab !== "passage")) return;
    const location = `${book}:${chapterNumber}:${translation}:${reference.verse}`;
    // Reveal navigation targets once. A save/refetch or responsive re-render
    // must never be treated as a request to move the reading viewport again.
    if (revealedPassage.current === location) return;
    const verse = document.getElementById(`bible-verse-${reference.verse}`);
    if (!verse) return;
    revealedPassage.current = location;
    verse.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [
    book,
    chapterNumber,
    translation,
    reference.verse,
    loading,
    desktop,
    mobileTab,
  ]);

  const mark = marks.find((item) => item.verse === reference.verse);
  const selectedVerse = chapter?.verses.find(
    (item) => item.number === reference.verse,
  );
  const previous = adjacentBibleChapter(reference, -1);
  const next = adjacentBibleChapter(reference, 1);

  /** A study reference is reading navigation, so reveal Passage on mobile.
   * Desktop keeps its existing side-by-side study and passage composition. */
  function openStudyPassage(target: BibleReference): void {
    setMobileTab("passage");
    onOpen(target);
  }

  function annotate(
    operation: "bookmark" | "highlight",
    highlight?: "teal" | "gold" | "blue" | null,
  ): void {
    const target = reference;
    const bookmarked = !mark?.bookmarked;
    const actionSurface = verseActionsRef.current;

    // Pending work disables the clicked button/fieldset. Move focus to a stable
    // dialog element first so the browser cannot fall back to the document body
    // and scroll it. Keep this scoped to verse actions, not shared button styles.
    actionSurface?.focus({ preventScroll: true });
    startTransition(async () => {
      try {
        const result = await setBibleMarkAction({
          ...target,
          operation,
          ...(operation === "bookmark" ? { bookmarked } : { highlight }),
        });
        if (!result.success) {
          showActionError(result);
          return;
        }
        updateData((resource) => {
          const values = resource.marks;
          const existing = values.find((item) => item.verse === target.verse);
          const updated = {
            ...target,
            bookmarked:
              operation === "bookmark"
                ? bookmarked
                : (existing?.bookmarked ?? false),
            highlight:
              operation === "highlight"
                ? (highlight ?? null)
                : (existing?.highlight ?? null),
          };
          return {
            ...resource,
            marks: [
              ...values.filter((item) => item.verse !== target.verse),
              updated,
            ],
          };
        });
        toast.success(t("annotationSaved"));
      } catch {
        toast.error(t("failed"), { duration: Infinity });
      }
    });
  }

  async function share(): Promise<void> {
    const text = `${selectedVerse?.text ?? ""}\n${bibleReferenceLabel(reference)} (${reference.translation})\n${window.location.origin}${bibleReferenceUrl({ ...reference, selection: undefined })}`;
    try {
      if (navigator.share)
        await navigator.share({ title: bibleReferenceLabel(reference), text });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast.success(t("copied"));
      } else setShareText(text);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setShareText(text);
    }
  }
  return (
    <Tabs
      value={desktop ? "passage" : mobileTab}
      onValueChange={(value) => {
        if (
          value === "passage" ||
          value === "words" ||
          value === "commentary" ||
          value === "crossReferences"
        )
          setMobileTab(value);
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_5rem_3rem] gap-2">
        <Button
          variant="secondary"
          onClick={() => setPicker(true)}
          className="min-w-0 px-2 text-sm sm:text-base"
        >
          {bibleReferenceLabel({ ...reference, verse: undefined })}
        </Button>
        <select
          className="bible-select"
          aria-label={t("translation")}
          value={reference.translation}
          onChange={(event) =>
            onOpen({
              ...reference,
              translation: event.target.value as BibleReference["translation"],
              selection: undefined,
            })
          }
        >
          {(["KJV", "WEB", "BSB"] as const).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <Button
          variant="outline"
          aria-label={t("textSettings")}
          onClick={() => setSettings(true)}
        >
          Aa
        </Button>
      </div>
      <BibleOpenPassages
        reference={reference}
        tabs={tabs}
        onOpen={onOpen}
        onCloseTab={onCloseTab}
      />
      <TabsList
        id="bible-reader-tabs"
        variant="line"
        className="grid min-h-12 w-full grid-cols-4 border-b border-border lg:hidden"
      >
        {(["passage", "words", "commentary", "crossReferences"] as const).map(
          (tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="min-h-11 min-w-0 px-1 text-[0.7rem] whitespace-normal sm:text-sm"
            >
              <span
                className={
                  tab === "crossReferences" ? undefined : "whitespace-nowrap"
                }
              >
                {t(tab)}
              </span>
            </TabsTrigger>
          ),
        )}
      </TabsList>
      {loading ? (
        <div className="min-h-60 rounded-card border border-border p-6">
          <LoadingSpinner label={t("loading")} />
          <div className="mt-5 space-y-4" aria-hidden="true">
            {[1, 2, 3, 4].map((key) => (
              <div
                key={key}
                className="h-12 animate-pulse rounded-control bg-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>
      ) : failed ? (
        <div
          role="alert"
          className="space-y-3 rounded-card border border-border p-5"
        >
          <p>{t("failed")}</p>
          <Button onClick={retry}>{t("retry")}</Button>
        </div>
      ) : (
        chapter && (
          <>
            {!selectedVerse && (
              <p
                role="status"
                className="rounded-control border border-info-border bg-info-subtle p-3 text-info-text"
              >
                {t("verseNotInEdition")}
              </p>
            )}
            <BiblePassageActions
              audioOpen={audioOpen}
              onToggleAudio={() => setAudioOpen((open) => !open)}
              reference={reference}
              chapter={chapter}
              selecting={selecting}
              chosen={chosen}
              onStart={() => {
                setMobileTab("passage");
                setDraft({
                  key: selectionKey,
                  active: true,
                  verses: selectedVerse ? [reference.verse] : [],
                });
              }}
              onCancel={() => {
                setDraft({ key: selectionKey, active: false, verses: [] });
                if (reference.selection)
                  onOpen({ ...reference, selection: undefined });
              }}
              onSelectAll={() =>
                setDraft({
                  key: selectionKey,
                  active: true,
                  verses: chapter.verses.map((verse) => verse.number),
                })
              }
            />
            <p className="text-sm text-muted-foreground lg:hidden">
              {t("verseLongPressHelp")}
            </p>
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <TabsContent value="passage" keepMounted className="min-w-0">
                <section
                  className="min-w-0 space-y-4"
                  aria-label={bibleReferenceLabel({
                    ...reference,
                    verse: undefined,
                  })}
                >
                  <div
                    className="space-y-3 font-medium"
                    style={{ fontSize, lineHeight: 1.8 }}
                  >
                    {chapter.verses.map((verse) => {
                      const annotation = marks.find(
                        (item) => item.verse === verse.number,
                      );
                      return (
                        <div
                          key={verse.number}
                          id={`bible-verse-${verse.number}`}
                          className="scroll-mt-4"
                        >
                          {verse.heading && (
                            <h2 className="mb-3 mt-6 font-heading text-2xl leading-tight">
                              {verse.heading}
                            </h2>
                          )}
                          <div
                            data-bible-active-verse={
                              !selecting &&
                              activeVerse === verseKey(verse.number)
                                ? "true"
                                : undefined
                            }
                            data-highlight={annotation?.highlight ?? undefined}
                            className={`bible-verse rounded-control border-l-4 p-3 ${(selecting ? chosen.includes(verse.number) : activeVerse === verseKey(verse.number)) ? "border-primary bg-primary/10" : "border-transparent"}`}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                aria-pressed={
                                  selecting
                                    ? chosen.includes(verse.number)
                                    : activeVerse === verseKey(verse.number)
                                }
                                onClick={(event) => {
                                  // A long press produces a click on release;
                                  // consume it so it does not undo activation.
                                  if (longPressCompleted.current) {
                                    longPressCompleted.current = false;
                                    return;
                                  }
                                  // Normal reading taps do nothing. Keyboard
                                  // activation remains an accessible alternative.
                                  if (
                                    !selecting &&
                                    activeVerse === verseKey(verse.number)
                                  ) {
                                    setActiveVerse(null);
                                  } else if (selecting || event.detail === 0)
                                    pickVerse(verse.number);
                                }}
                                onPointerDown={(event) => {
                                  longPressCompleted.current = false;
                                  if (
                                    desktop ||
                                    selecting ||
                                    event.button !== 0
                                  )
                                    return;
                                  cancelPress();
                                  press.current = {
                                    x: event.clientX,
                                    y: event.clientY,
                                    timer: setTimeout(() => {
                                      press.current = null;
                                      longPressCompleted.current = true;
                                      // Touch activation is granted on release;
                                      // vibrate there, rather than in this timer.
                                      pickVerse(verse.number, false);
                                    }, 500),
                                  };
                                }}
                                onPointerMove={(event) => {
                                  // Scrolling must never accidentally open actions.
                                  if (
                                    press.current &&
                                    Math.hypot(
                                      event.clientX - press.current.x,
                                      event.clientY - press.current.y,
                                    ) > 10
                                  )
                                    cancelPress();
                                }}
                                onPointerUp={() => {
                                  if (longPressCompleted.current)
                                    pulseBibleSelection();
                                  cancelPress();
                                }}
                                onPointerCancel={cancelPress}
                                onPointerLeave={cancelPress}
                                onContextMenu={(event) => {
                                  if (!desktop) event.preventDefault();
                                }}
                                className="min-h-11 flex-1 select-none text-left focus-visible:outline-2 focus-visible:outline-ring"
                              >
                                <sup className="mr-2 font-bold text-primary">
                                  {verse.number}
                                </sup>
                                {verse.text}
                                {annotation?.bookmarked && (
                                  <span
                                    className="ml-2 text-sm text-primary"
                                    aria-label={t("bookmarked")}
                                  >
                                    ◆
                                  </span>
                                )}
                              </button>
                              <Button
                                className="hidden size-11 lg:inline-flex"
                                variant="ghost"
                                size="icon"
                                aria-label={t("verseActions", {
                                  verse: verse.number,
                                })}
                                onClick={() => pickVerse(verse.number)}
                              >
                                <MoreHorizontalIcon aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-card border border-border p-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("previousChapter")}
                      disabled={!previous}
                      onClick={() => previous && onOpen(previous)}
                    >
                      <ChevronLeftIcon aria-hidden="true" />
                    </Button>
                    <span>
                      {bibleReferenceLabel({ ...reference, verse: undefined })}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("nextChapter")}
                      disabled={!next}
                      onClick={() => next && onOpen(next)}
                    >
                      <ChevronRightIcon aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <a
                      className="underline"
                      href={chapter.source.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {chapter.source.name}
                    </a>{" "}
                    ·{" "}
                    <a
                      className="underline"
                      href={chapter.source.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("license")}
                    </a>{" "}
                    · Free Use Bible API
                  </p>
                </section>
              </TabsContent>
              <aside
                hidden={!desktop && mobileTab === "passage"}
                id="bible-study-panel"
                className={`min-w-0 scroll-mt-4 space-y-4 ${showingCommentary ? "" : "lg:sticky lg:top-4 lg:self-start"}`}
              >
                {!showingCommentary && (desktop || mobileTab !== "passage") && (
                  <label className="mb-3 block space-y-1 text-sm">
                    <span>{t("verse")}</span>
                    <select
                      className="bible-select"
                      value={reference.verse}
                      onChange={(event) =>
                        onOpen({
                          ...reference,
                          verse: Number(event.target.value),
                          selection: undefined,
                        })
                      }
                    >
                      {chapter.verses.map((verse) => (
                        <option key={verse.number} value={verse.number}>
                          {bibleReferenceLabel({
                            ...reference,
                            verse: verse.number,
                          })}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {desktop ? (
                  <BibleStudyPanel
                    reference={reference}
                    activeTab={desktopStudyTab}
                    onTabChange={setDesktopStudyTab}
                    authors={authors}
                    onOpen={openStudyPassage}
                    selectedAuthor={commentaryAuthor}
                    onAuthorChange={setCommentaryAuthor}
                  />
                ) : (
                  (["words", "commentary", "crossReferences"] as const).map(
                    (tab) => (
                      <TabsContent key={tab} value={tab}>
                        {mobileTab === tab && (
                          <BibleStudyPanel
                            reference={reference}
                            authors={authors}
                            onOpen={openStudyPassage}
                            selectedAuthor={commentaryAuthor}
                            onAuthorChange={setCommentaryAuthor}
                            activeTab={tab}
                            hideTabs
                          />
                        )}
                      </TabsContent>
                    ),
                  )
                )}
              </aside>
            </div>
            {/* The selected verse keeps a compact floating entry point. Its
                controls use the existing accessible mobile drawer/desktop dialog. */}
            {!selecting &&
              selectedVerse &&
              activeVerse === verseKey(reference.verse) && (
                <div
                  className="bible-verse-floating-actions"
                  data-bible-verse-actions
                >
                  <ResponsiveDialog
                    key={activeVerse}
                    open={verseDialog === activeVerse}
                    scrollLock="preserve-layout"
                    onOpenChange={(open) =>
                      setVerseDialog(open ? activeVerse : null)
                    }
                    onExitComplete={() => setActiveVerse(null)}
                    title={t("verseActions", { verse: reference.verse })}
                    description={bibleReferenceLabel(reference)}
                    closeLabel={t("closeHelp")}
                    trigger={
                      <Button
                        size="icon-lg"
                        className="size-11 rounded-full"
                        aria-label={t("verseActions", {
                          verse: reference.verse,
                        })}
                      >
                        <MoreHorizontalIcon aria-hidden="true" />
                      </Button>
                    }
                  >
                    <div
                      ref={verseActionsRef}
                      tabIndex={-1}
                      className="bible-dialog space-y-4 text-sm leading-normal outline-none"
                    >
                      <div className="flex flex-wrap gap-2">
                        <LoadingButton
                          isPending={pending}
                          pendingLabel={t("saving")}
                          variant="secondary"
                          onClick={() => annotate("bookmark")}
                        >
                          {t(mark?.bookmarked ? "removeBookmark" : "save")}
                        </LoadingButton>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            // Close this surface before a possible manual-copy
                            // dialog so two focus traps never compete.
                            setVerseDialog(null);
                            void share();
                          }}
                        >
                          {t("share")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setVerseDialog(null);
                            setMobileTab("words");
                          }}
                          className="lg:hidden"
                        >
                          {t("study")}
                        </Button>
                      </div>
                      <fieldset
                        disabled={pending}
                        className="flex flex-wrap gap-2"
                      >
                        <legend className="mb-2 text-xs text-muted-foreground">
                          {t("highlight")}
                        </legend>
                        {(["teal", "gold", "blue"] as const).map((color) => (
                          <Button
                            key={color}
                            variant={
                              mark?.highlight === color ? "default" : "outline"
                            }
                            aria-pressed={mark?.highlight === color}
                            onClick={() => annotate("highlight", color)}
                            className="px-3 text-xs"
                          >
                            {t(`colors.${color}`)}
                          </Button>
                        ))}
                        {mark?.highlight && (
                          <Button
                            variant="ghost"
                            onClick={() => annotate("highlight", null)}
                          >
                            {t("clear")}
                          </Button>
                        )}
                      </fieldset>
                      {selectedVerse.footnotes.length > 0 && (
                        <details>
                          <summary className="min-h-11 cursor-pointer py-2">
                            {t("footnotes")}
                          </summary>
                          {selectedVerse.footnotes.map((note, index) => (
                            <p
                              key={index}
                              className="mt-2 text-muted-foreground"
                            >
                              {note}
                            </p>
                          ))}
                        </details>
                      )}
                    </div>
                  </ResponsiveDialog>
                </div>
              )}
            {/* Keep fixed audio outside the sticky desktop study column. */}
            <AnimatePresence mode="wait">
              {audioOpen && (
                <BibleAudioPlayer
                  key={`${reference.translation}:${reference.book}:${reference.chapter}`}
                  audio={chapter.audio}
                  reference={reference}
                />
              )}
            </AnimatePresence>
          </>
        )
      )}
      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="bible-dialog max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle className="pr-14 font-heading text-2xl">
            {t("goToVerse")}
          </DialogTitle>
          <BiblePassagePicker
            key={`${reference.book}:${reference.chapter}`}
            reference={reference}
            onOpen={(value) => {
              setPicker(false);
              onOpen(value);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="bible-dialog">
          <DialogTitle className="pr-14 font-heading text-2xl">
            {t("textSettings")}
          </DialogTitle>
          <label>
            {t("fontSize")} · {fontSize}px
            <input
              className="min-h-11 w-full accent-primary"
              type="range"
              min={18}
              max={28}
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
            />
          </label>
        </DialogContent>
      </Dialog>
      <Dialog
        open={shareText !== null}
        onOpenChange={(open) => {
          if (!open) setShareText(null);
        }}
      >
        <DialogContent className="bible-dialog">
          <DialogTitle className="pr-14 font-heading text-2xl">
            {t("share")}
          </DialogTitle>
          <p>{t("manualCopy")}</p>
          <textarea
            readOnly
            value={shareText ?? ""}
            onFocus={(event) => event.target.select()}
            className="min-h-48 w-full rounded-control border border-border bg-background p-3"
          />
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
