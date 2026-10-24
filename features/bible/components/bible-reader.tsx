"use client";

/** Chapter reader owns loading and annotation state; the provider never controls markup or HTML. */
import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
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

/** Reader tabs stay session-local; only deliberate bookmark/highlight actions write to PostgreSQL. */
export function BibleReader({
  reference,
  tabs,
  authors,
  onOpen,
  onCloseTab,
  onBack,
}: {
  reference: BibleReference;
  tabs: BibleReference[];
  authors: { id: string; name: string }[];
  onOpen: (reference: BibleReference) => void;
  onCloseTab: (index: number) => void;
  onBack: () => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
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
  const [fontSize, setFontSize] = useState(21);
  const [shareText, setShareText] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!loading)
      document
        .getElementById(`bible-verse-${reference.verse}`)
        ?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [reference.verse, loading]);

  const mark = marks.find((item) => item.verse === reference.verse);
  const selectedVerse = chapter?.verses.find(
    (item) => item.number === reference.verse,
  );
  const previous = adjacentBibleChapter(reference, -1);
  const next = adjacentBibleChapter(reference, 1);

  function annotate(
    operation: "bookmark" | "highlight",
    highlight?: "teal" | "gold" | "blue" | null,
  ): void {
    const target = reference;
    const bookmarked = !mark?.bookmarked;
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
    const text = `${selectedVerse?.text ?? ""}\n${bibleReferenceLabel(reference)} (${reference.translation})\n${window.location.origin}${bibleReferenceUrl(reference)}`;
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
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon aria-hidden="true" />
        {t("backBooks")}
      </Button>
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
      <div className="flex flex-wrap gap-2" aria-label={t("openChapters")}>
        {tabs.map((item, index) => (
          <div
            key={`${item.book}:${item.chapter}:${item.translation}`}
            className="flex min-w-0 items-center rounded-control border border-border bg-card"
          >
            <Button
              className="min-w-0 px-2 text-xs"
              variant={
                item.book === reference.book &&
                item.chapter === reference.chapter &&
                item.translation === reference.translation
                  ? "default"
                  : "ghost"
              }
              onClick={() => onOpen(item)}
            >
              {bibleReferenceLabel({ ...item, verse: undefined })} ·{" "}
              {item.translation}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("closeChapter", {
                reference: bibleReferenceLabel({ ...item, verse: undefined }),
              })}
              disabled={tabs.length === 1}
              onClick={() => onCloseTab(index)}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
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
            {!selectedVerse && <p role="status" className="rounded-control border border-info-border bg-info-subtle p-3 text-info-text">{t("verseNotInEdition")}</p>}
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <section
                className="min-w-0 space-y-4"
                aria-label={bibleReferenceLabel({
                  ...reference,
                  verse: undefined,
                })}
              >
                <h1 className="font-heading text-3xl">
                  {bibleReferenceLabel({ ...reference, verse: undefined })}
                </h1>
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
                          data-highlight={annotation?.highlight ?? undefined}
                          className={`bible-verse rounded-control border-l-4 p-3 ${reference.verse === verse.number ? "border-primary bg-primary/10" : "border-transparent"}`}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              aria-pressed={reference.verse === verse.number}
                              onClick={() =>
                                onOpen({ ...reference, verse: verse.number })
                              }
                              className="min-h-11 flex-1 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-ring"
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
                              variant="ghost"
                              size="icon"
                              aria-label={t("verseActions", {
                                verse: verse.number,
                              })}
                              onClick={() =>
                                onOpen({ ...reference, verse: verse.number })
                              }
                            >
                              <MoreHorizontalIcon aria-hidden="true" />
                            </Button>
                          </div>
                          {reference.verse === verse.number && (
                            <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm leading-normal">
                              <div className="flex flex-wrap gap-2">
                                <LoadingButton
                                  isPending={pending}
                                  pendingLabel={t("saving")}
                                  variant="secondary"
                                  onClick={() => annotate("bookmark")}
                                >
                                  {t(
                                    mark?.bookmarked
                                      ? "removeBookmark"
                                      : "save",
                                  )}
                                </LoadingButton>
                                <Button
                                  variant="secondary"
                                  onClick={() => void share()}
                                >
                                  {t("share")}
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    document
                                      .getElementById("bible-study-panel")
                                      ?.scrollIntoView({
                                        block: "start",
                                        behavior: "instant",
                                      })
                                  }
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
                                {(["teal", "gold", "blue"] as const).map(
                                  (color) => (
                                    <Button
                                      key={color}
                                      variant={
                                        mark?.highlight === color
                                          ? "default"
                                          : "outline"
                                      }
                                      aria-pressed={mark?.highlight === color}
                                      onClick={() =>
                                        annotate("highlight", color)
                                      }
                                      className="px-3 text-xs"
                                    >
                                      {t(`colors.${color}`)}
                                    </Button>
                                  ),
                                )}
                                {mark?.highlight && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => annotate("highlight", null)}
                                  >
                                    {t("clear")}
                                  </Button>
                                )}
                              </fieldset>
                              {verse.footnotes.length > 0 && (
                                <details>
                                  <summary className="min-h-11 cursor-pointer py-2">
                                    {t("footnotes")}
                                  </summary>
                                  {verse.footnotes.map((note, index) => (
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
                          )}
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
              <aside
                id="bible-study-panel"
                className="min-w-0 scroll-mt-4 space-y-4 lg:sticky lg:top-4 lg:self-start"
              >
                <BibleStudyPanel
                  reference={reference}
                  authors={authors}
                  onOpen={onOpen}
                />
              </aside>
            </div>
            {/* Keep fixed audio outside the sticky desktop study column. */}
            <BibleAudioPlayer
              key={`${reference.translation}:${reference.book}:${reference.chapter}`}
              audio={chapter.audio}
              reference={reference}
            />
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
    </div>
  );
}
