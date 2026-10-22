"use client";

/** The saved library is paginated and owner-private; opening it never initializes records. */
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { readSavedBibleAction } from "../actions/bible-reader.action";
import { bibleReferenceLabel } from "../lib/bible-reference";
import type { BibleReference } from "../schemas/bible.schema";
import { useBibleResource } from "../hooks/use-bible-resource";

/** Separate bookmark/highlight filters share a single bounded query and look-ahead page. */
export function BibleLibrary({
  onOpen,
}: {
  onOpen: (reference: BibleReference) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [filter, setFilter] = useState<"all" | "bookmarks" | "highlights">(
    "all",
  );
  const [page, setPage] = useState(1);
  const load = useCallback(
    () => readSavedBibleAction({ page, filter }),
    [page, filter],
  );
  const { data, failed, retry } = useBibleResource(`${page}:${filter}`, load);
  return (
    <section className="space-y-4">
      <h1 className="font-heading text-4xl">{t("saved")}</h1>
      <p className="text-muted-foreground">{t("savedPrivate")}</p>
      <div className="flex flex-wrap gap-2">
        {(["all", "bookmarks", "highlights"] as const).map((value) => (
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
        ))}
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
                key={`${mark.book}:${mark.chapter}:${mark.verse}:${mark.translation}`}
                className="rounded-card border border-border bg-card p-3"
              >
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-between gap-2 whitespace-normal py-3 text-left"
                  onClick={() => onOpen(mark)}
                >
                  <span>
                    {bibleReferenceLabel(mark)} · {mark.translation}
                  </span>
                  <span className="text-xs text-primary">
                    {mark.bookmarked ? t("bookmarked") : ""}
                    {mark.highlight
                      ? ` · ${t("highlight")}: ${t(`colors.${mark.highlight}`)}`
                      : ""}
                  </span>
                </Button>
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
