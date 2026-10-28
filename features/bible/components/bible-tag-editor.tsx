"use client";

/** Reusable tag draft editor. Only its parent's explicit Save persists changes.
 * Suggestions load once on opening the editor, never while typing or polling. */
import { useCallback, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { readBibleTagsAction } from "../actions/bible-reader.action";
import { bibleTagSchema, bibleTagsSchema } from "../schemas/bible.schema";
import { useBibleResource } from "../hooks/use-bible-resource";

/** Canonical chips are selectable; a new label becomes available after saving. */
export function BibleTagEditor({
  tags,
  onChange,
  disabled = false,
  suggestions,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  suggestions?: string[];
}): React.ReactNode {
  const t = useTranslations("Bible");
  const id = useId();
  const [draft, setDraft] = useState("");
  const load = useCallback(
    () =>
      suggestions
        ? Promise.resolve({
            success: true as const,
            message: "",
            data: suggestions,
          })
        : readBibleTagsAction(),
    [suggestions],
  );
  const { data, failed, retry } = useBibleResource("tag-suggestions", load);
  const candidate = bibleTagSchema.safeParse(draft);
  const existing = [...new Set([...tags, ...(data ?? [])])];
  const visible = existing.filter(
    (tag) => tags.includes(tag) || tag.includes(draft.trim().toLowerCase()),
  );
  const canCreate = candidate.success && !existing.includes(candidate.data);

  function add(): void {
    const parsed = bibleTagsSchema.safeParse([...tags, draft]);
    if (!parsed.success) {
      toast.error(t("tagsInvalid"));
      return;
    }
    onChange(parsed.data);
    setDraft("");
  }

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2">
      <legend className="mb-2 font-medium">{t("tags")}</legend>
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        {t("tagsHelp")}
      </p>
      <div>
        <Input
          id={id}
          aria-label={t("newTag")}
          aria-describedby={`${id}-help`}
          className="h-11"
          maxLength={32}
          value={draft}
          placeholder={t("newTag")}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
      </div>
      {canCreate && (
        <Button
          variant="outline"
          className="min-h-11 max-w-full whitespace-normal break-all text-left"
          disabled={tags.length >= 10}
          onClick={add}
        >
          {t("createTag", { name: candidate.data })}
        </Button>
      )}
      <div className="flex flex-wrap gap-1">
        {visible.map((tag) => (
          <Button
            key={tag}
            variant={tags.includes(tag) ? "default" : "outline"}
            className="min-h-11 max-w-full gap-1 px-3 text-sm"
            aria-pressed={tags.includes(tag)}
            disabled={!tags.includes(tag) && tags.length >= 10}
            onClick={() =>
              onChange(
                tags.includes(tag)
                  ? tags.filter((item) => item !== tag)
                  : [...tags, tag].sort(),
              )
            }
          >
            <span className="truncate">#{tag}</span>
            {tags.includes(tag) && (
              <XIcon aria-hidden="true" className="size-3" />
            )}
          </Button>
        ))}
      </div>
      {failed && (
        <Button variant="ghost" onClick={retry}>
          {t("retry")}
        </Button>
      )}
    </fieldset>
  );
}
