"use client";

/** The saved library is paginated and owner-private; opening it never initializes records. */
import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { readSavedBibleAction } from "../actions/bible-reader.action";
import { setBiblePassageAction } from "../actions/bible-reader.action";
import { bibleSelectionLabel } from "../lib/bible-reference";
import { LoadingButton } from "@/components/shared/loading-button";
import { showActionError } from "@/lib/errors/show-action-error";
import { toast } from "@/lib/toast";
import type { BibleReference } from "../schemas/bible.schema";
import { useBibleResource } from "../hooks/use-bible-resource";

/** Separate bookmark/highlight filters share a single bounded query and look-ahead page. */
export function BibleLibrary({
  onOpen,
}: {
  onOpen: (reference: BibleReference) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [filter, setFilter] = useState<
    "all" | "bookmarks" | "highlights" | "passages"
  >("all");
  const [page, setPage] = useState(1);
  const load = useCallback(
    () => readSavedBibleAction({ page, filter }),
    [page, filter],
  );
  const { data, failed, retry } = useBibleResource(`${page}:${filter}`, load);
  const [pending, startTransition] = useTransition();
  function remove(reference: BibleReference): void {
    startTransition(async () => {
      try {
        const result = await setBiblePassageAction({
          ...reference,
          saved: false,
        });
        if (!result.success) {
          showActionError(result);
          return;
        }
        toast.success(t("passageRemoved"));
        // Reload the bounded page so the next item fills the removed slot.
        if (page > 1 && data?.marks.length === 1) setPage(page - 1);
        else retry();
      } catch {
        toast.error(t("failed"));
      }
    });
  }
  return (
    <section className="space-y-4">
      <h1 className="font-heading text-4xl">{t("saved")}</h1>
      <p className="text-muted-foreground">{t("savedPrivate")}</p>
      <div className="flex flex-wrap gap-2">
        {(["all", "bookmarks", "highlights", "passages"] as const).map(
          (value) => (
            <Button
              key={value}
              variant={value === filter ? "default" : "secondary"}
              aria-pressed={value === filter}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {t(value)}
            </Button>
          ),
        )}
      </div>
      {failed ? (
        <div role="alert">
          <p>{t("failed")}</p>
          <Button onClick={retry}>{t("retry")}</Button>
        </div>
      ) : !data ? (
        <LoadingSpinner label={t("loading")} />
      ) : data.marks.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon aria-hidden="true" />}
          title={t("nothingSaved")}
          description={t("nothingSavedHelp")}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data.marks.map((mark) => (
              <li
                key={`${mark.book}:${mark.chapter}:${mark.verse}:${mark.translation}:${JSON.stringify(mark.selection)}`}
                className="rounded-card border border-border bg-card p-3"
              >
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-between gap-2 whitespace-normal py-3 text-left"
                  onClick={() => onOpen(mark)}
                >
                  <span>
                    {bibleSelectionLabel(mark)} · {mark.translation}
                  </span>
                  <span className="text-xs text-primary">
                    {mark.selection
                      ? t(
                          mark.selection === "chapter"
                            ? "wholeChapter"
                            : "savedSelection",
                        )
                      : mark.bookmarked
                        ? t("bookmarked")
                        : ""}
                    {mark.highlight
                      ? ` · ${t("highlight")}: ${t(`colors.${mark.highlight}`)}`
                      : ""}
                  </span>
                </Button>
                {mark.selection && (
                  <LoadingButton
                    variant="ghost"
                    isPending={pending}
                    pendingLabel={t("saving")}
                    onClick={() => remove(mark)}
                  >
                    {t("removeSavedPassage")}
                  </LoadingButton>
                )}
              </li>
            ))}
          </ul>
          <div className="flex justify-between gap-3">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              {t("previous")}
            </Button>
            <Button
              variant="secondary"
              disabled={!data.hasNext}
              onClick={() => setPage((value) => value + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
