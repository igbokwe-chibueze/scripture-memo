"use client";

/** Optional post-save tagging, shared by reader actions and the Saved library.
 * Nothing mounts/loads until explicitly opened. Tag drafts never write until
 * Save tags; closing this surface never undoes the original bookmark/save.
 */
import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { showActionError } from "@/lib/errors/show-action-error";
import {
  readBibleItemTagsAction,
  setBibleItemTagsAction,
} from "../actions/bible-reader.action";
import { useBibleResource } from "../hooks/use-bible-resource";
import { bibleSelectionLabel } from "../lib/bible-reference";
import type { BibleReference } from "../schemas/bible.schema";
import { BibleTagEditor } from "./bible-tag-editor";

/** Reads current tags only when the caller has no already-loaded library item. */
function ItemTagsForm({
  reference,
  initialTags,
  suggestions,
  onSaved,
}: {
  reference: BibleReference;
  initialTags?: string[];
  suggestions?: string[];
  onSaved: (tags: string[]) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const load = useCallback(
    () =>
      initialTags
        ? Promise.resolve({
            success: true as const,
            message: "",
            data: initialTags,
          })
        : readBibleItemTagsAction(reference),
    [initialTags, reference],
  );
  const { data, failed, retry } = useBibleResource(
    JSON.stringify(reference),
    load,
  );
  const [draft, setDraft] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    // Retire only this flow's old confirmations so they cannot cover Save tags
    // at the bottom of a mobile drawer. Unrelated notifications stay untouched.
    toast.dismiss("bible-save-feedback");
    toast.dismiss("bible-tags-feedback");
  }, []);

  function save(): void {
    if (!data || pending) return;
    const tags = draft ?? data;
    startTransition(async () => {
      try {
        const result = await setBibleItemTagsAction({ ...reference, tags });
        if (!result.success) {
          showActionError(result);
          return;
        }
        toast.success(t("tagsSaved"), { id: "bible-tags-feedback" });
        onSaved(tags);
      } catch {
        toast.error(t("failed"));
      }
    });
  }

  if (failed) return <Button onClick={retry}>{t("retry")}</Button>;
  if (!data) return <LoadingSpinner label={t("loading")} />;
  return (
    <div className="space-y-4">
      <BibleTagEditor
        tags={draft ?? data}
        onChange={setDraft}
        disabled={pending}
        suggestions={suggestions}
      />
      <LoadingButton
        isPending={pending}
        pendingLabel={t("saving")}
        onClick={save}
      >
        {t("saveTags")}
      </LoadingButton>
    </div>
  );
}

/** Snapshot reference prevents a delayed toast action tagging a different verse. */
export function BibleItemTagsDialog({
  reference,
  initialTags,
  suggestions,
  onClose,
  onSaved,
}: {
  reference: BibleReference | null;
  initialTags?: string[];
  suggestions?: string[];
  onClose: () => void;
  onSaved?: (reference: BibleReference, tags: string[]) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  return (
    <ResponsiveDialog
      open={reference !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      scrollLock="preserve-layout"
      title={t("editTags")}
      description={reference ? bibleSelectionLabel(reference) : ""}
      closeLabel={t("closeHelp")}
      trigger={<button type="button" hidden aria-label={t("editTags")} />}
    >
      {reference && (
        <ItemTagsForm
          key={JSON.stringify(reference)}
          reference={reference}
          initialTags={initialTags}
          suggestions={suggestions}
          onSaved={(tags) => {
            onSaved?.(reference, tags);
            onClose();
          }}
        />
      )}
    </ResponsiveDialog>
  );
}
