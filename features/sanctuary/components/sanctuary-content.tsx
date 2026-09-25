/** Shared Sanctuary rendering; the caller owns persistence and navigation. */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  FeatherIcon,
  HeartIcon,
  LockKeyholeIcon,
  NotebookPenIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Textarea } from "@/components/ui/textarea";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";
import type { SanctuaryData } from "@/features/sanctuary/types/sanctuary.types";
import type { ActionResult } from "@/types/api";

/** Narrow callback contract keeps sample notes out of real persistence. */
export type SanctuaryTransport = {
  saveNote: (input: { verseId: string; content: string }) => Promise<ActionResult>;
  toggleFavorite: (input: { verseId: string }) => Promise<ActionResult<{ isFavorite: boolean }>>;
};

type SanctuaryViewName = "study" | "notes";

/** Calm private reflection surface with explicit save and favorite feedback. */
export function SanctuaryContent({
  data,
  transport,
  studyContent,
  contentsNavigation,
  backHref = "/vault",
}: {
  data: SanctuaryData;
  transport: SanctuaryTransport;
  studyContent: React.ReactNode;
  contentsNavigation: React.ReactNode;
  backHref?: string;
}): React.ReactNode {
  const t = useTranslations("Sanctuary");
  const [activeView, setActiveView] = useState<SanctuaryViewName>("study");
  const [note, setNote] = useState(data.personalNote);
  const [isFavorite, setIsFavorite] = useState(data.isFavorite);
  const [isSaving, startSaving] = useTransition();
  const [isFavoriting, startFavoriting] = useTransition();

  const saveNote = (): void => {
    startSaving(async () => {
      const result = await transport.saveNote({
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
      const result = await transport.toggleFavorite({
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
            href={backHref}
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
          <blockquote className="relative mx-auto mt-5 max-w-4xl font-sans text-lg leading-8 font-medium text-foreground/88 sm:text-2xl sm:leading-10">
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
            {studyContent}
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
            {contentsNavigation}

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
