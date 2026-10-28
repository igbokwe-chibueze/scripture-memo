"use client";

/** The saved library is paginated and owner-private; opening it never initializes records. */
import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  BookmarkIcon,
  BookmarkMinusIcon,
  EraserIcon,
  Trash2Icon,
  TagsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { readSavedBibleAction } from "../actions/bible-reader.action";
import {
  setBiblePassageAction,
  setBibleMarkAction,
  readBibleTagsAction,
} from "../actions/bible-reader.action";
import { bibleSelectionLabel } from "../lib/bible-reference";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { BibleItemTagsDialog } from "./bible-item-tags-dialog";
import type { BibleMark } from "../types/bible.types";
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
  const [tag, setTag] = useState("");
  const loadTags = useCallback(() => readBibleTagsAction(), []);
  const { data: availableTags, retry: retryTags } = useBibleResource(
    "library-tags",
    loadTags,
  );
  const [editing, setEditing] = useState<{
    mark: BibleMark;
    tags: string[];
  } | null>(null);
  const load = useCallback(
    () => readSavedBibleAction({ page, filter, tag: tag || undefined }),
    [page, filter, tag],
  );
  const { data, failed, retry } = useBibleResource(
    `${page}:${filter}:${tag}`,
    load,
  );
  const [pending, startTransition] = useTransition();
  const [removal, setRemoval] = useState<{
    mark: BibleMark;
    operation: "bookmark" | "highlight" | "passage";
  } | null>(null);

  /** Remove only the confirmed annotation; a verse's other saved state survives.
   * Reuse owner-authorized actions, with one mutation and one bounded refresh.
   * Failed requests leave the library intact and surface the action error.
   */
  function remove(): void {
    if (!removal || pending) return;
    const { mark, operation } = removal;
    startTransition(async () => {
      try {
        const result =
          operation === "passage"
            ? await setBiblePassageAction({ ...mark, saved: false })
            : await setBibleMarkAction({
                ...mark,
                operation,
                ...(operation === "bookmark"
                  ? { bookmarked: false }
                  : { highlight: null }),
              });
        if (!result.success) {
          showActionError(result);
          return;
        }
        toast.success(
          t(operation === "passage" ? "passageRemoved" : "annotationSaved"),
        );
        // Reload the bounded page so the next item fills the removed slot.
        const keepsOtherMark =
          !mark.selection &&
          filter === "all" &&
          (operation === "bookmark"
            ? Boolean(mark.highlight)
            : mark.bookmarked);
        if (page > 1 && data?.marks.length === 1 && !keepsOtherMark)
          setPage(page - 1);
        else retry();
        retryTags();
      } catch {
        toast.error(t("failed"));
      }
    });
  }

  return (
    <section className="space-y-4">
      <h1 className="font-heading text-4xl">{t("saved")}</h1>
      <p className="text-muted-foreground">{t("savedPrivate")}</p>
      {pending && <LoadingSpinner label={t("saving")} />}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["all", "bookmarks", "highlights", "passages"] as const).map(
          (value) => (
            <Button
              key={value}
              variant={value === filter ? "default" : "secondary"}
              aria-pressed={value === filter}
              disabled={pending}
              className="min-h-11 shrink-0 px-3 py-2 text-sm"
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
      <label className="flex items-center gap-2 text-sm">
        <TagsIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <span className="shrink-0">{t("filterTags")}</span>
        <select
          className="bible-select min-h-11 min-w-0 flex-1"
          value={tag}
          disabled={pending}
          onChange={(event) => {
            setTag(event.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("allTags")}</option>
          {[...new Set([...(availableTags ?? []), ...(tag ? [tag] : [])])].map(
            (value) => (
              <option key={value} value={value}>
                #{value}
              </option>
            ),
          )}
        </select>
      </label>
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
          <ul className="divide-y divide-border overflow-hidden rounded-control border border-border bg-card">
            {data.marks.map((mark) => (
              <li
                key={`${mark.book}:${mark.chapter}:${mark.verse}:${mark.translation}:${JSON.stringify(mark.selection)}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2"
              >
                <Button
                  variant="ghost"
                  className="h-auto min-h-11 min-w-0 flex-col items-start justify-center gap-0.5 whitespace-normal rounded-none px-0 py-1 text-left text-sm"
                  onClick={() => onOpen(mark)}
                >
                  <span>
                    {bibleSelectionLabel(mark)} · {mark.translation}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
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
                      ? `${mark.bookmarked ? " · " : ""}${t("highlight")}: ${t(`colors.${mark.highlight}`)}`
                      : ""}
                  </span>
                  {(mark.tags?.length ?? 0) > 0 && (
                    <span className="flex flex-wrap gap-x-2 text-xs font-normal text-primary">
                      {mark.tags?.map((label) => (
                        <span key={label} className="break-all">
                          #{label}
                        </span>
                      ))}
                    </span>
                  )}
                </Button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    disabled={pending}
                    aria-label={t("editTags")}
                    title={t("editTags")}
                    onClick={() => setEditing({ mark, tags: mark.tags ?? [] })}
                  >
                    <TagsIcon aria-hidden="true" />
                  </Button>
                  {(
                    [
                      {
                        operation: "bookmark",
                        visible: !mark.selection && mark.bookmarked,
                        icon: BookmarkMinusIcon,
                        label: "removeBookmark",
                      },
                      {
                        operation: "highlight",
                        visible: !mark.selection && Boolean(mark.highlight),
                        icon: EraserIcon,
                        label: "removeHighlight",
                      },
                      {
                        operation: "passage",
                        visible: Boolean(mark.selection),
                        icon: Trash2Icon,
                        label: "removeSavedPassage",
                      },
                    ] as const
                  )
                    .filter((action) => action.visible)
                    .map(({ operation, icon: Icon, label }) => (
                      <Button
                        key={operation}
                        variant="ghost"
                        size="icon"
                        className="min-h-11 min-w-11"
                        disabled={pending}
                        aria-label={t(label)}
                        title={t(label)}
                        onClick={() => setRemoval({ mark, operation })}
                      >
                        <Icon aria-hidden="true" />
                      </Button>
                    ))}
                </div>
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
      <BibleItemTagsDialog
        reference={editing?.mark ?? null}
        initialTags={editing?.tags}
        suggestions={availableTags}
        onClose={() => setEditing(null)}
        onSaved={() => {
          // A removed filter tag can empty this page; restart pagination safely.
          if (page !== 1) setPage(1);
          else retry();
          retryTags();
        }}
      />
      <ConfirmationDialog
        open={removal !== null}
        onOpenChange={(open) => {
          if (!open) setRemoval(null);
        }}
        title={t(
          removal?.operation === "bookmark"
            ? "removeBookmark"
            : removal?.operation === "highlight"
              ? "removeHighlight"
              : "removeSavedPassage",
        )}
        description={t("confirmRemoval", {
          reference: removal ? bibleSelectionLabel(removal.mark) : "",
        })}
        confirmLabel={t("confirmRemove")}
        cancelLabel={t("cancelRemoval")}
        destructive
        isConfirmDisabled={pending}
        onConfirm={remove}
      />
    </section>
  );
}
