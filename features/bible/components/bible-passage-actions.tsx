"use client";

/** Chapter/selection actions operate on canonical locations. Selecting and
 * sharing never call the server; only deliberate Save writes one grouped row. */
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "@/lib/toast";
import { showActionError } from "@/lib/errors/show-action-error";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { setBiblePassageAction } from "../actions/bible-reader.action";
import { bibleReferenceUrl, bibleSelectionLabel } from "../lib/bible-reference";
import type { BibleChapter } from "../types/bible.types";
import type { BibleReference } from "../schemas/bible.schema";

/** Native share, clipboard and manual copy all preserve edition and exact set.
 * A share link contains only public canonical references, never bookmark IDs. */
export function BiblePassageActions({
  reference,
  chapter,
  selecting,
  chosen,
  onStart,
  onCancel,
  onSelectAll,
}: {
  reference: BibleReference;
  chapter: BibleChapter;
  selecting: boolean;
  chosen: number[];
  onStart: () => void;
  onCancel: () => void;
  onSelectAll: () => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [menu, setMenu] = useState(false);
  const [shareTarget, setShareTarget] = useState<BibleReference | null>(null);
  const [manualText, setManualText] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const whole: BibleReference = {
    ...reference,
    verse: 1,
    selection: "chapter",
  };
  const selection: BibleReference = {
    ...reference,
    verse: chosen[0] ?? 1,
    selection: chosen,
  };

  function save(target: BibleReference): void {
    startTransition(async () => {
      try {
        const result = await setBiblePassageAction({ ...target, saved: true });
        if (!result.success) {
          showActionError(result);
          return;
        }
        toast.success(t("passageSaved"));
        setMenu(false);
        // Only completed selection actions dismiss the selection card; failures
        // retain the chosen verses so the player can retry without reselecting.
        if (Array.isArray(target.selection)) onCancel();
      } catch {
        toast.error(t("failed"));
      }
    });
  }

  async function share(linkOnly: boolean): Promise<void> {
    if (!shareTarget) return;
    const url = `${window.location.origin}${bibleReferenceUrl(shareTarget)}`;
    const verses =
      shareTarget.selection === "chapter"
        ? chapter.verses
        : chapter.verses.filter(
            (verse) =>
              Array.isArray(shareTarget.selection) &&
              shareTarget.selection.includes(verse.number),
          );
    const label = `${bibleSelectionLabel(shareTarget)} (${shareTarget.translation})`;
    const text = linkOnly
      ? url
      : `${label}\n${verses.map((verse) => `${verse.number} ${verse.text}`).join("\n")}\n${url}`;
    try {
      if (navigator.share)
        await navigator.share(
          linkOnly ? { title: label, url } : { title: label, text },
        );
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast.success(t("copied"));
      } else {
        setManualText(text);
        setShareTarget(null);
        return;
      }
      setShareTarget(null);
      // Native sharing and clipboard copying must finish before selection closes.
      // Cancellation and manual-copy fallbacks leave the selection available.
      if (Array.isArray(shareTarget.selection)) onCancel();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setManualText(text);
        setShareTarget(null);
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 font-heading text-2xl">
          {bibleSelectionLabel({ ...reference, selection: "chapter" })}
        </h1>
        <ResponsiveDialog
          open={menu}
          onOpenChange={setMenu}
          title={t("chapterActions")}
          description={bibleSelectionLabel(whole)}
          closeLabel={t("closeHelp")}
          trigger={
            <Button
              variant="outline"
              size="icon-lg"
              className="size-11"
              aria-label={t("chapterActions")}
            >
              <MoreHorizontalIcon aria-hidden="true" />
            </Button>
          }
        >
          {/* Equal grid tracks keep all three actions on one row. Labels may
              wrap inside their track so translated copy fits mobile drawers. */}
          <div className="grid grid-cols-3 items-stretch gap-2">
            <LoadingButton
              className="h-auto min-h-11 min-w-0 whitespace-normal px-2 py-2 leading-tight"
              isPending={pending}
              pendingLabel={t("saving")}
              onClick={() => save(whole)}
            >
              {t("saveChapter")}
            </LoadingButton>
            <Button
              variant="outline"
              className="h-auto min-h-11 min-w-0 whitespace-normal px-2 py-2 leading-tight"
              onClick={() => {
                setMenu(false);
                setShareTarget(whole);
              }}
            >
              {t("shareChapter")}
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-11 min-w-0 whitespace-normal px-2 py-2 leading-tight"
              onClick={() => {
                setMenu(false);
                onStart();
              }}
            >
              {t("selectVerses")}
            </Button>
          </div>
        </ResponsiveDialog>
      </div>
      {selecting && (
        <div className="space-y-2 rounded-control border border-selection-border bg-selection-subtle p-3">
          <p role="status" className="font-medium">
            {t("selectedVerseCount", { count: chosen.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onSelectAll}>
              {t("selectAll")}
            </Button>
            <LoadingButton
              isPending={pending}
              pendingLabel={t("saving")}
              disabled={!chosen.length}
              onClick={() => save(selection)}
            >
              {t("saveSelection")}
            </LoadingButton>
            <Button
              variant="outline"
              disabled={!chosen.length}
              onClick={() => setShareTarget(selection)}
            >
              {t("share")}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              {t("cancelSelection")}
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={shareTarget !== null}
        onOpenChange={(open) => {
          if (!open) setShareTarget(null);
        }}
      >
        <DialogContent className="bible-dialog">
          <DialogTitle className="pr-14 text-2xl">{t("share")}</DialogTitle>
          <p>
            {shareTarget && bibleSelectionLabel(shareTarget)} ·{" "}
            {shareTarget?.translation}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void share(false)}>{t("shareText")}</Button>
            <Button variant="outline" onClick={() => void share(true)}>
              {t("shareLink")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={manualText !== null}
        onOpenChange={(open) => {
          if (!open) setManualText(null);
        }}
      >
        <DialogContent className="bible-dialog">
          <DialogTitle className="pr-14 text-2xl">
            {t("manualCopy")}
          </DialogTitle>
          <textarea
            aria-label={t("share")}
            readOnly
            value={manualText ?? ""}
            onFocus={(event) => event.target.select()}
            className="min-h-48 w-full rounded-control border border-border bg-background p-3"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
