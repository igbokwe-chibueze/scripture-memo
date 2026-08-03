"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeftIcon,
  BookHeartIcon,
  FeatherIcon,
  HeartIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";
import { saveSanctuaryNoteAction } from "@/features/sanctuary/actions/save-sanctuary-note.action";
import { toggleSanctuaryFavoriteAction } from "@/features/sanctuary/actions/toggle-sanctuary-favorite.action";
import type { SanctuaryData } from "@/features/sanctuary/types/sanctuary.types";

/** Renders trusted admin-authored Markdown while refusing embedded HTML. */
function StudyNote({ children }: { children: string }): React.ReactNode {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h1: ({ children: value }) => <h3 className="mb-3 font-heading text-xl font-black">{value}</h3>,
        h2: ({ children: value }) => <h3 className="mb-3 mt-5 font-heading text-lg font-black first:mt-0">{value}</h3>,
        h3: ({ children: value }) => <h4 className="mb-2 mt-4 font-bold first:mt-0">{value}</h4>,
        p: ({ children: value }) => <p className="mb-3 last:mb-0">{value}</p>,
        ul: ({ children: value }) => <ul className="mb-3 list-disc space-y-1 pl-5">{value}</ul>,
        ol: ({ children: value }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{value}</ol>,
        blockquote: ({ children: value }) => <blockquote className="my-4 border-l-3 border-violet-300 pl-4 italic text-muted-foreground">{value}</blockquote>,
        a: ({ children: value, href }) => <a href={href} target="_blank" rel="noreferrer noopener" className="font-bold text-violet-700 underline underline-offset-4 dark:text-violet-300">{value}</a>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

/** Calm private reflection surface with explicit save and favorite feedback. */
export function SanctuarySpace({ data }: { data: SanctuaryData }): React.ReactNode {
  const t = useTranslations("Sanctuary");
  const [note, setNote] = useState(data.personalNote);
  const [isFavorite, setIsFavorite] = useState(data.isFavorite);
  const [isSaving, startSaving] = useTransition();
  const [isFavoriting, startFavoriting] = useTransition();

  const saveNote = (): void => {
    startSaving(async () => {
      const result = await saveSanctuaryNoteAction({ verseId: data.verseId, content: note });
      if (!result.success) {
        showActionError(result);
        return;
      }
      toast.success(result.message, { duration: 4_000 });
    });
  };

  const toggleFavorite = (): void => {
    startFavoriting(async () => {
      const result = await toggleSanctuaryFavoriteAction({ verseId: data.verseId });
      if (!result.success) {
        showActionError(result);
        return;
      }
      if (result.data) setIsFavorite(result.data.isFavorite);
      toast.success(result.message, { duration: 4_000 });
    });
  };

  return (
    <main className="min-h-dvh bg-linear-to-b from-violet-50 via-background to-emerald-50 px-4 py-5 text-foreground dark:from-violet-950 dark:via-slate-950 dark:to-emerald-950 sm:px-6 sm:py-9">
      <div className="mx-auto max-w-4xl">
        <nav className="flex items-center justify-between gap-3" aria-label={t("navigation")}>
          <Link href="/vault" className={cn(buttonVariants({ variant: "ghost" }), "min-h-11 rounded-xl")}>
            <ArrowLeftIcon aria-hidden="true" /> {t("backToVault")}
          </Link>
          <LoadingButton
            variant="outline"
            isPending={isFavoriting}
            pendingLabel={t("updating")}
            className={cn(
              "rounded-xl px-4",
              isFavorite && "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200",
            )}
            onClick={toggleFavorite}
          >
            <HeartIcon className={cn(isFavorite && "fill-current")} aria-hidden="true" />
            {isFavorite ? t("favorited") : t("favorite")}
          </LoadingButton>
        </nav>

        <article className="mt-5 overflow-hidden rounded-[2rem] border border-violet-200/70 bg-card/90 shadow-xl shadow-violet-950/8 dark:border-violet-300/15 dark:bg-slate-900/90">
          <header className="relative overflow-hidden px-5 py-8 text-center sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.18),transparent_58%)]" />
            <FeatherIcon className="relative mx-auto size-8 text-violet-500" aria-hidden="true" />
            <p className="relative mt-4 text-xs font-black tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">{data.translation}</p>
            <h1 className="relative mt-2 font-heading text-3xl font-black sm:text-4xl">{data.reference}</h1>
            <blockquote className="relative mx-auto mt-7 max-w-3xl font-heading text-xl leading-9 font-bold text-foreground/90 sm:text-2xl sm:leading-10">“{data.verseText}”</blockquote>
          </header>

          <div className="grid gap-4 border-t border-border/70 p-4 sm:p-6 lg:grid-cols-2">
            {data.reflection && (
              <section className="rounded-3xl border border-emerald-200/70 bg-emerald-50/70 p-5 dark:border-emerald-300/15 dark:bg-emerald-950/20">
                <BookHeartIcon className="size-6 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                <h2 className="mt-4 font-heading text-xl font-black">{t("reflection")}</h2>
                <p className="mt-3 leading-7 text-foreground/75">{data.reflection}</p>
              </section>
            )}
            {data.studyNote && (
              <section className="rounded-3xl border border-violet-200/70 bg-violet-50/70 p-5 dark:border-violet-300/15 dark:bg-violet-950/20">
                <FeatherIcon className="size-6 text-violet-600 dark:text-violet-300" aria-hidden="true" />
                <h2 className="mt-4 font-heading text-xl font-black">{t("studyNote")}</h2>
                <div className="mt-3 leading-7 text-foreground/75"><StudyNote>{data.studyNote}</StudyNote></div>
              </section>
            )}
          </div>

          <section className="border-t border-border/70 p-4 sm:p-6" aria-labelledby="private-note-title">
            <div className="flex items-center justify-between gap-3">
              <div><h2 id="private-note-title" className="font-heading text-xl font-black">{t("yourNotes")}</h2><p className="text-xs text-muted-foreground">{t("privateOnly")}</p></div>
              <span className="text-xs font-bold text-muted-foreground">{note.length}/5000</span>
            </div>
            <Textarea
              value={note}
              maxLength={5_000}
              rows={6}
              className="mt-4 min-h-40 resize-y rounded-2xl bg-background/80 p-4 leading-7"
              placeholder={t("notePlaceholder")}
              onChange={(event) => setNote(event.currentTarget.value)}
            />
            <LoadingButton isPending={isSaving} pendingLabel={t("saving")} className="mt-4 min-h-12 w-full rounded-xl bg-violet-600 font-black text-white hover:bg-violet-500" onClick={saveNote}>
              <SaveIcon aria-hidden="true" /> {t("saveNote")}
            </LoadingButton>
          </section>
        </article>
      </div>
    </main>
  );
}
