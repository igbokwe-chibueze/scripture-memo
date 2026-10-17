/** Shared Sanctuary rendering; the caller owns persistence and navigation. */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  BookOpenIcon,
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
import Image from "next/image";
import { Button } from "@/components/ui/button";
import styles from "./sanctuary.module.css";
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
  backHref = "/vault",
}: {
  data: SanctuaryData;
  transport: SanctuaryTransport;
  studyContent: React.ReactNode;
  backHref?: string;
}): React.ReactNode {
  const t = useTranslations("Sanctuary");
  const [activeView, setActiveView] = useState<SanctuaryViewName>("study");
  const [translation, setTranslation] = useState(data.translation);
  const selectedText = data.translations.find(
    (item) => item.translation === translation,
  )?.text ?? data.verseText;
  const [note, setNote] = useState(data.personalNote);
  const [isFavorite, setIsFavorite] = useState(data.isFavorite);
  const [isSaving, startSaving] = useTransition();
  const [isFavoriting, startFavoriting] = useTransition();

  const saveNote = (): void => {
    startSaving(async () => {
      try {
        const result = await transport.saveNote({
          verseId: data.verseId,
          content: note,
        });
        if (!result.success) {
          showActionError(result);
          return;
        }
        toast.success(result.message, { duration: 4_000 });
      } catch {
        toast.error(t("saveError"), { duration: Infinity });
      }
    });
  };

  const toggleFavorite = (): void => {
    startFavoriting(async () => {
      try {
        const result = await transport.toggleFavorite({
          verseId: data.verseId,
        });
        if (!result.success) {
          showActionError(result);
          return;
        }
        if (result.data) setIsFavorite(result.data.isFavorite);
        toast.success(result.message, { duration: 4_000 });
      } catch {
        toast.error(t("favoriteError"), { duration: Infinity });
      }
    });
  };

  return (
    <main className={styles.page}>
      <nav className={styles.topRow} aria-label={t("navigation")}>
        <NavigationButton
          href={backHref}
          pendingLabel={t("openingVault")}
          variant="secondary"
          className="min-h-11 gap-2 px-4"
        >
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
          {t("backToVault")}
        </NavigationButton>
        <span className={styles.mobileIdentity}>
          <Image src="/images/game-ui/bible-open.png" alt="" width={30} height={30} />
          {t("screenTitle")}
        </span>
      </nav>
      <header className={styles.heading}>
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">{data.reference}</h1>
        <label>
          <span className="sr-only">{t("temporaryTranslation")}</span>
          <select
            value={translation}
            onChange={(event) => {
              const match = data.translations.find((item) => item.translation === event.target.value);
              if (match) setTranslation(match.translation);
            }}
          >
            {data.translations.map((item) => (
              <option key={item.translation} value={item.translation}>{item.translation}</option>
            ))}
          </select>
        </label>
        <LoadingButton
          variant="ghost"
          isPending={isFavoriting}
          pendingLabel={t("updating")}
          aria-label={isFavorite ? t("favorited") : t("favorite")}
          aria-pressed={isFavorite}
          className={cn("size-11 shrink-0 rounded-full p-2", isFavorite && "text-error-text")}
          onClick={toggleFavorite}
        >
          <HeartIcon className={cn("size-7", isFavorite && "fill-current")} aria-hidden="true" />
        </LoadingButton>
      </header>
      <blockquote className={styles.verse} aria-live="polite">{selectedText}</blockquote>
      <div className={styles.tabs} role="group" aria-label={t("viewOptions")}>
        <Button
          id="sanctuary-study-tab"
          aria-pressed={activeView === "study"}
          aria-controls="sanctuary-study-panel"
          variant={activeView === "study" ? "default" : "ghost"}
          onClick={() => setActiveView("study")}
        >
          <BookOpenIcon className="size-5" aria-hidden="true" />{t("studyTab")}
        </Button>
        <Button
          id="sanctuary-notes-tab"
          aria-pressed={activeView === "notes"}
          aria-controls="sanctuary-notes-panel"
          variant={activeView === "notes" ? "default" : "ghost"}
          onClick={() => setActiveView("notes")}
        >
          <NotebookPenIcon className="size-5" aria-hidden="true" />{t("notesTab")}
        </Button>
      </div>
      {/* Both panels stay mounted: unsaved notes and native details state survive
        * tab changes. Desktop uses the same tabs rather than a second editor. */}
      <article
        id="sanctuary-study-panel"
        aria-labelledby="sanctuary-study-tab"
        hidden={activeView !== "study"}
        className={styles.study}
      >
        {studyContent}
      </article>
      <section
        id="sanctuary-notes-panel"
        aria-labelledby="sanctuary-notes-tab"
        hidden={activeView !== "notes"}
        className="mt-5"
      >
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
                <NotebookPenIcon className="size-5 text-selection-text" aria-hidden="true" />
                {t("yourNotes")}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <LockKeyholeIcon className="size-3" aria-hidden="true" />
                {t("privateOnly")}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{note.length}/5000</span>
          </div>
          <label htmlFor="private-note-input" className="sr-only">{t("yourNotes")}</label>
          <Textarea
            id="private-note-input"
            name="privateNote"
            value={note}
            maxLength={5_000}
            rows={10}
            className="mt-4 min-h-52 resize-y rounded-xl bg-background p-4 leading-7"
            placeholder={t("notePlaceholder")}
            onChange={(event) => setNote(event.currentTarget.value)}
          />
          <LoadingButton
            isPending={isSaving}
            pendingLabel={t("saving")}
            className="mt-4 min-h-11 w-full"
            onClick={saveNote}
          >
            <SaveIcon className="size-5" aria-hidden="true" />
            {t("saveNote")}
          </LoadingButton>
        </div>
      </section>
    </main>
  );
}
