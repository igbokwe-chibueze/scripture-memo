"use client";

/** Accessible native selectors stay usable on small touch screens and with the system keyboard. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import type { BibleReference } from "../schemas/bible.schema";

/** One picker serves Home and the reader; dependent selections reset before becoming invalid. */
export function BiblePassagePicker({
  reference,
  onOpen,
  compact = false,
}: {
  reference: BibleReference;
  onOpen: (reference: BibleReference) => void;
  /** Home's concept keeps the three selectors on one mobile row; dialogs retain the roomier layout. */
  compact?: boolean;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [value, setValue] = useState(reference);
  const [testament, setTestament] = useState(
    BIBLE_BOOKS.find((book) => book.id === reference.book)?.testament ?? "old",
  );
  const book = BIBLE_BOOKS.find((item) => item.id === value.book)!;
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onOpen(value);
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        {(["old", "new"] as const).map((part) => (
          <Button
            key={part}
            type="button"
            variant={testament === part ? "default" : "secondary"}
            aria-pressed={testament === part}
            onClick={() => {
              setTestament(part);
              setValue({
                ...value,
                book: part === "old" ? "GEN" : "MAT",
                chapter: 1,
                verse: 1,
              });
            }}
          >
            {t(part)}
          </Button>
        ))}
      </div>
      <div
        className={
          compact
            ? "grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 text-sm sm:text-base"
            : "grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr]"
        }
      >
        <label
          className={
            compact ? "min-w-0 space-y-1" : "col-span-2 space-y-1 sm:col-span-1"
          }
        >
          <span>{t("book")}</span>
          <select
            className="bible-select"
            value={value.book}
            onChange={(event) =>
              setValue({
                ...value,
                book: event.target.value,
                chapter: 1,
                verse: 1,
              })
            }
          >
            {BIBLE_BOOKS.filter((item) => item.testament === testament).map(
              (item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="space-y-1">
          <span>{t("chapter")}</span>
          <select
            className="bible-select"
            value={value.chapter}
            onChange={(event) =>
              setValue({
                ...value,
                chapter: Number(event.target.value),
                verse: 1,
              })
            }
          >
            {book.chapters.map((_, index) => (
              <option key={index + 1}>{index + 1}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span>{t("verse")}</span>
          <select
            className="bible-select"
            value={value.verse}
            onChange={(event) =>
              setValue({ ...value, verse: Number(event.target.value) })
            }
          >
            {Array.from(
              { length: book.chapters[value.chapter - 1] },
              (_, index) => (
                <option key={index + 1}>{index + 1}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <Button type="submit" className="w-full">
        {t("openVerse")}
        {compact && <ArrowRightIcon aria-hidden="true" />}
      </Button>
    </form>
  );
}
