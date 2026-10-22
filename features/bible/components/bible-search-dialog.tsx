"use client";

/** Search is submit-driven: typing causes no remote requests or database reads. */
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { showActionError } from "@/lib/errors/show-action-error";
import { searchBibleAction } from "../actions/bible-reader.action";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import { bibleReferenceLabel } from "../lib/bible-reference";
import {
  bibleReferenceSchema,
  type BibleReference,
} from "../schemas/bible.schema";
import type { BibleSearchHit } from "../types/bible.types";

/** Accepts exact references as well as literal full-text phrases in the selected edition. */
export function BibleSearchDialog({
  translation,
  onOpen,
}: {
  translation: BibleReference["translation"];
  onOpen: (reference: BibleReference) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [hits, setHits] = useState<BibleSearchHit[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const generation = useRef(0);

  function search(value: string, nextPage = 1): void {
    const normalized = value.trim();
    const reference = normalized.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (reference) {
      const name = reference[1].toLowerCase().replace(/^psalm$/, "psalms");
      const book = BIBLE_BOOKS.find(
        (item) =>
          item.name.toLowerCase() === name || item.id.toLowerCase() === name,
      );
      const parsed = bibleReferenceSchema.safeParse({
        book: book?.id,
        chapter: Number(reference[2]),
        verse: Number(reference[3] ?? 1),
        translation,
      });
      if (parsed.success) {
        setOpen(false);
        onOpen(parsed.data);
        return;
      }
      toast.error(t("invalid"), { duration: Infinity });
      return;
    }
    if (normalized.length < 3) {
      toast.error(t("searchHelp"), { duration: Infinity });
      return;
    }
    const current = ++generation.current;
    setSubmitted(normalized);
    setFailed(false);
    setPage(nextPage);
    startTransition(async () => {
      try {
        const result = await searchBibleAction({
          q: normalized,
          translation,
          page: nextPage,
        });
        if (generation.current !== current) return;
        if (result.success && result.data) {
          setHits(result.data.hits);
          setTotal(result.data.total);
        } else if (!result.success) {
          setFailed(true);
          showActionError(result);
        }
      } catch {
        setFailed(true);
        toast.error(t("failed"), { duration: Infinity });
      }
    });
  }
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label={t("search")}
        onClick={() => setOpen(true)}
      >
        <SearchIcon aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bible-dialog max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle className="pr-14 font-heading text-2xl">
            {t("search")} · {translation}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t("searchHelp")}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              search(query);
            }}
            className="flex flex-wrap gap-2"
          >
            <Input
              aria-label={t("search")}
              maxLength={100}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="min-h-11 min-w-0 flex-1"
            />
            <LoadingButton
              isPending={pending}
              pendingLabel={t("searching")}
              type="submit"
            >
              {t("search")}
            </LoadingButton>
          </form>
          {failed ? (
            <Button variant="secondary" onClick={() => search(submitted, page)}>
              {t("retry")}
            </Button>
          ) : (
            total !== null &&
            !pending && (
              <>
                <p role="status">{t("resultCount", { count: total })}</p>
                <ul className="space-y-3">
                  {hits.map((hit) => (
                    <li key={`${hit.book}:${hit.chapter}:${hit.verse}`}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setOpen(false);
                          onOpen(hit);
                        }}
                        className="h-auto w-full items-start whitespace-normal py-3 text-left"
                      >
                        <span>
                          <span className="block font-bold text-primary">
                            {bibleReferenceLabel(hit)}
                          </span>
                          <span className="mt-1 block font-medium">
                            {hit.text}
                          </span>
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between gap-3">
                  <Button
                    variant="ghost"
                    disabled={page <= 1}
                    onClick={() => search(submitted, page - 1)}
                  >
                    {t("previous")}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={page * 20 >= total}
                    onClick={() => search(submitted, page + 1)}
                  >
                    {t("next")}
                  </Button>
                </div>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
