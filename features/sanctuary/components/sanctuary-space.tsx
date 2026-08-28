"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeftIcon,
  BookHeartIcon,
  BookOpenIcon,
  FeatherIcon,
  HeartIcon,
  ListTreeIcon,
  LockKeyholeIcon,
  NotebookPenIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Textarea } from "@/components/ui/textarea";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";
import { saveSanctuaryNoteAction } from "@/features/sanctuary/actions/save-sanctuary-note.action";
import { toggleSanctuaryFavoriteAction } from "@/features/sanctuary/actions/toggle-sanctuary-favorite.action";
import type { SanctuaryData } from "@/features/sanctuary/types/sanctuary.types";

type SanctuaryViewName = "study" | "notes";

type StudySection = {
  id: string;
  title: string;
  markdown: string;
};

/**
 * Removes the imported guide label and duplicated opening verse.
 *
 * WHY: The Sanctuary hero already presents the canonical reference and verse.
 * The audited study guides intentionally repeat both in their source document,
 * but showing that preamble again in the reader creates unnecessary repetition.
 * Only the known leading import convention is removed; the devotional sections
 * and every later quotation remain untouched.
 */
function removeImportedStudyPreamble(markdown: string): string {
  const paragraphs = markdown
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim());

  if (/^\*\*.+study guide\*\*$/i.test(paragraphs[0] ?? "")) {
    paragraphs.shift();
  }

  const possibleVerse = paragraphs[0] ?? "";
  if (possibleVerse.startsWith("*") && possibleVerse.endsWith("*")) {
    paragraphs.shift();
  }

  return paragraphs.join("\n\n").trim();
}

/** Converts a study heading into a stable, readable in-page anchor. */
function toSectionId(title: string, index: number): string {
  const slug = title
    .toLocaleLowerCase("en")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");

  return `study-${slug || index + 1}`;
}

/**
 * Separates the trusted Markdown into devotional reading sections.
 *
 * WHY: A long study guide rendered as one prose block is difficult to scan on
 * a phone. Splitting only on level-two headings preserves the source Markdown
 * and its order while giving every major thought a clear visual resting point.
 */
function parseStudySections(markdown: string): {
  introduction: string;
  sections: StudySection[];
} {
  const readerMarkdown = removeImportedStudyPreamble(markdown);
  const headingPattern = /^##\s+(.+)$/gm;
  const matches = [...readerMarkdown.matchAll(headingPattern)];

  if (matches.length === 0) {
    return { introduction: readerMarkdown, sections: [] };
  }

  const firstHeadingIndex = matches[0]?.index ?? 0;
  const introduction = readerMarkdown.slice(0, firstHeadingIndex).trim();
  const sections = matches.map((match, index) => {
    const title = match[1]?.trim() || `Section ${index + 1}`;
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = matches[index + 1]?.index ?? readerMarkdown.length;

    return {
      id: toSectionId(title, index),
      title,
      markdown: readerMarkdown.slice(contentStart, contentEnd).trim(),
    };
  });

  return { introduction, sections };
}

/** Renders trusted admin-authored Markdown while refusing embedded HTML. */
function StudyMarkdown({
  children,
  softenEmphasis = false,
}: {
  children: string;
  softenEmphasis?: boolean;
}): React.ReactNode {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h1: ({ children: value }) => (
          <h3 className="mb-3 font-heading text-xl font-black">{value}</h3>
        ),
        h2: ({ children: value }) => (
          <h3 className="mb-3 font-heading text-xl font-black">{value}</h3>
        ),
        h3: ({ children: value }) => (
          <h4 className="mb-2 mt-5 font-heading font-black first:mt-0">
            {value}
          </h4>
        ),
        p: ({ children: value }) => (
          <p className="mb-4 leading-7 text-foreground/78 last:mb-0 sm:leading-8">
            {value}
          </p>
        ),
        ul: ({ children: value }) => (
          <ul className="mb-4 list-disc space-y-3 pl-5 marker:text-violet-500">
            {value}
          </ul>
        ),
        ol: ({ children: value }) => (
          <ol className="mb-4 list-decimal space-y-3 pl-5 marker:font-black marker:text-violet-500">
            {value}
          </ol>
        ),
        li: ({ children: value }) => (
          <li className="pl-1 leading-7 text-foreground/78">{value}</li>
        ),
        blockquote: ({ children: value }) => (
          <blockquote className="my-5 rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 font-heading italic text-foreground/85 dark:border-amber-300/15 dark:bg-amber-950/20">
            {value}
          </blockquote>
        ),
        strong: ({ children: value }) => (
          <strong
            className={cn(
              "text-foreground",
              softenEmphasis ? "font-normal" : "font-black",
            )}
          >
            {value}
          </strong>
        ),
        a: ({ children: value, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="font-bold text-violet-700 underline underline-offset-4 dark:text-violet-300"
          >
            {value}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

/** Identifies sections whose imported bold markup should read as normal copy. */
function usesRegularBodyWeight(title: string): boolean {
  const normalizedTitle = title.toLocaleLowerCase("en");
  return (
    normalizedTitle.includes("tags") ||
    normalizedTitle.includes("key lesson")
  );
}

/** Gives the most devotional sections a warmer, more prominent surface. */
function sectionTreatment(title: string): string {
  const normalizedTitle = title.toLocaleLowerCase("en");
  if (normalizedTitle.includes("prayer")) {
    return "border-amber-300/60 bg-amber-50/60 dark:border-amber-300/15 dark:bg-amber-950/18";
  }
  if (
    normalizedTitle.includes("key lesson") ||
    normalizedTitle.includes("reflection")
  ) {
    return "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-300/15 dark:bg-emerald-950/18";
  }
  if (normalizedTitle.includes("application")) {
    return "border-violet-300/60 bg-violet-50/60 dark:border-violet-300/15 dark:bg-violet-950/18";
  }
  return "border-border/70 bg-card/72";
}

/** Calm private reflection surface with explicit save and favorite feedback. */
export function SanctuarySpace({ data }: { data: SanctuaryData }): React.ReactNode {
  const t = useTranslations("Sanctuary");
  const [activeView, setActiveView] = useState<SanctuaryViewName>("study");
  const [note, setNote] = useState(data.personalNote);
  const [isFavorite, setIsFavorite] = useState(data.isFavorite);
  const [isSaving, startSaving] = useTransition();
  const [isFavoriting, startFavoriting] = useTransition();
  const study = useMemo(
    () => (data.studyNote ? parseStudySections(data.studyNote) : null),
    [data.studyNote],
  );

  const saveNote = (): void => {
    startSaving(async () => {
      const result = await saveSanctuaryNoteAction({
        verseId: data.verseId,
        content: note,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }
      toast.success(result.message, { duration: 4_000 });
    });
  };

  const toggleFavorite = (): void => {
    startFavoriting(async () => {
      const result = await toggleSanctuaryFavoriteAction({
        verseId: data.verseId,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }
      if (result.data) setIsFavorite(result.data.isFavorite);
      toast.success(result.message, { duration: 4_000 });
    });
  };

  return (
    <main className="min-h-dvh bg-linear-to-b from-violet-50 via-background to-emerald-50 px-4 py-4 text-foreground dark:from-violet-950 dark:via-slate-950 dark:to-emerald-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[90rem]">
        <nav
          className="flex items-center justify-between gap-3"
          aria-label={t("navigation")}
        >
          <NavigationButton
            href="/vault"
            pendingLabel={t("openingVault")}
            variant="outline"
            aria-label={t("backToVault")}
            className="min-w-11 px-3 sm:px-4"
          >
            <ArrowLeftIcon aria-hidden="true" />
            <span className="hidden sm:inline">{t("backToVault")}</span>
          </NavigationButton>
          <LoadingButton
            variant="outline"
            isPending={isFavoriting}
            pendingLabel={t("updating")}
            aria-label={isFavorite ? t("favorited") : t("favorite")}
            className={cn(
              "min-w-11 px-3 sm:px-4",
              isFavorite &&
                "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200",
            )}
            onClick={toggleFavorite}
          >
            <HeartIcon
              className={cn(isFavorite && "fill-current")}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {isFavorite ? t("favorited") : t("favorite")}
            </span>
          </LoadingButton>
        </nav>

        <header className="relative mt-4 overflow-hidden rounded-[2rem] border border-violet-200/70 bg-card/90 px-5 py-7 text-center shadow-lg shadow-violet-950/6 dark:border-violet-300/15 dark:bg-slate-900/90 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.2),transparent_60%)]" />
          <FeatherIcon
            className="relative mx-auto size-7 text-violet-500"
            aria-hidden="true"
          />
          <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-black tracking-[0.14em] uppercase">
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-violet-700 dark:text-violet-300">
              {data.translation}
            </span>
            <span className="text-muted-foreground">{t("eyebrow")}</span>
          </div>
          <h1 className="relative mt-3 font-heading text-3xl font-black sm:text-4xl">
            {data.reference}
          </h1>
          <blockquote className="relative mx-auto mt-5 max-w-4xl font-heading text-lg leading-8 font-bold text-foreground/88 sm:text-2xl sm:leading-10">
            “{data.verseText}”
          </blockquote>
        </header>

        <div
          className="mt-4 grid grid-cols-2 rounded-2xl border bg-card/90 p-1 shadow-sm lg:hidden"
          role="tablist"
          aria-label={t("viewOptions")}
        >
          <button
            type="button"
            id="sanctuary-study-tab"
            role="tab"
            aria-controls="sanctuary-study-panel"
            aria-selected={activeView === "study"}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition-colors",
              activeView === "study"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => setActiveView("study")}
          >
            <BookOpenIcon className="size-4" aria-hidden="true" />
            {t("studyTab")}
          </button>
          <button
            type="button"
            id="sanctuary-notes-tab"
            role="tab"
            aria-controls="sanctuary-notes-panel"
            aria-selected={activeView === "notes"}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition-colors",
              activeView === "notes"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => setActiveView("notes")}
          >
            <NotebookPenIcon className="size-4" aria-hidden="true" />
            {t("notesTab")}
          </button>
        </div>

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_23rem] 2xl:gap-7">
          <article
            id="sanctuary-study-panel"
            role="tabpanel"
            aria-labelledby="sanctuary-study-tab"
            className={cn(
              "min-w-0 space-y-4",
              activeView !== "study" && "hidden lg:block",
            )}
          >
            {study && study.sections.length > 0 && (
              <details className="rounded-2xl border bg-card/90 p-4 lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-black text-violet-700 dark:text-violet-300">
                  <ListTreeIcon className="size-5" aria-hidden="true" />
                  {t("contents")}
                </summary>
                <ol className="mt-2 space-y-1 border-t pt-3">
                  {study.sections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-bold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-xs text-violet-700 dark:text-violet-300">
                          {index + 1}
                        </span>
                        <span>{section.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {data.reflection && (
              <section className="rounded-3xl border border-emerald-300/60 bg-emerald-50/70 p-5 dark:border-emerald-300/15 dark:bg-emerald-950/20 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                    <BookHeartIcon className="size-5" aria-hidden="true" />
                  </span>
                  <h2 className="font-heading text-xl font-black">
                    {t("reflection")}
                  </h2>
                </div>
                <p className="mt-4 leading-7 text-foreground/78 sm:leading-8">
                  {data.reflection}
                </p>
              </section>
            )}

            {study ? (
              <>
                {study.introduction && (
                  <section className="rounded-3xl border border-violet-200/70 bg-card/82 p-5 dark:border-violet-300/15 sm:p-7">
                    <StudyMarkdown>{study.introduction}</StudyMarkdown>
                  </section>
                )}
                {study.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className={cn(
                      "scroll-mt-6 rounded-3xl border p-5 sm:p-7",
                      sectionTreatment(section.title),
                    )}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <SparklesIcon
                        className="size-5 shrink-0 text-violet-500"
                        aria-hidden="true"
                      />
                      <h2 className="font-heading text-xl font-black sm:text-2xl">
                        {section.title}
                      </h2>
                    </div>
                    <StudyMarkdown
                      softenEmphasis={usesRegularBodyWeight(section.title)}
                    >
                      {section.markdown}
                    </StudyMarkdown>
                  </section>
                ))}
              </>
            ) : (
              <section className="rounded-3xl border border-dashed bg-card/70 p-7 text-center sm:p-10">
                <BookOpenIcon
                  className="mx-auto size-9 text-violet-500"
                  aria-hidden="true"
                />
                <h2 className="mt-4 font-heading text-xl font-black">
                  {t("studyComingSoon")}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {t("studyComingSoonBody")}
                </p>
              </section>
            )}
          </article>

          <aside
            id="sanctuary-notes-panel"
            role="tabpanel"
            aria-labelledby="sanctuary-notes-tab"
            className={cn(
              "min-w-0 space-y-4 lg:sticky lg:top-5",
              activeView !== "notes" && "hidden lg:block",
            )}
          >
            {study && study.sections.length > 0 && (
              <nav
                className="hidden rounded-3xl border bg-card/82 p-4 lg:block"
                aria-label={t("contents")}
              >
                <p className="text-xs font-black tracking-[0.14em] text-violet-700 uppercase dark:text-violet-300">
                  {t("contents")}
                </p>
                <ol className="mt-2 space-y-0.5">
                  {study.sections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex min-h-8 items-center gap-2 rounded-lg px-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-violet-500/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <span className="grid size-5 shrink-0 place-items-center rounded-md bg-violet-500/10 text-[0.65rem] text-violet-700 dark:text-violet-300">
                          {index + 1}
                        </span>
                        <span className="line-clamp-1">{section.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <section
              className="rounded-3xl border bg-card/90 p-5 sm:p-6"
              aria-labelledby="private-note-title"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <NotebookPenIcon
                      className="size-5 text-violet-500"
                      aria-hidden="true"
                    />
                    <h2
                      id="private-note-title"
                      className="font-heading text-xl font-black"
                    >
                      {t("yourNotes")}
                    </h2>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <LockKeyholeIcon className="size-3" aria-hidden="true" />
                    {t("privateOnly")}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">
                  {note.length}/5000
                </span>
              </div>
              <Textarea
                value={note}
                maxLength={5_000}
                rows={8}
                className="mt-4 min-h-52 resize-y rounded-2xl bg-background/80 p-4 leading-7"
                placeholder={t("notePlaceholder")}
                onChange={(event) => setNote(event.currentTarget.value)}
              />
              <LoadingButton
                isPending={isSaving}
                pendingLabel={t("saving")}
                className="mt-4 min-h-12 w-full"
                onClick={saveNote}
              >
                <SaveIcon aria-hidden="true" />
                {t("saveNote")}
              </LoadingButton>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
