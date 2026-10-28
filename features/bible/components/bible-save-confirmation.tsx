"use client";

/** Optional inline follow-up to a successful save. No timer, focus movement or
 * data access: the reader owns its reference and hides it on chapter changes. */
import { useTranslations } from "next-intl";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Compact shared treatment for verse saves and grouped passage saves. */
export function BibleSaveConfirmation({
  message,
  onAddTags,
  onDismiss,
}: {
  message: string;
  onAddTags: () => void;
  onDismiss: () => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  return (
    <div
      data-bible-save-confirmation
      className="flex min-w-0 items-center gap-1 rounded-control border border-selection-border bg-selection-subtle px-2 text-sm leading-normal text-foreground"
    >
      <span
        role="status"
        className="flex min-w-0 flex-1 items-center gap-1.5 py-2"
      >
        <CheckIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-primary"
        />
        <span>{message}</span>
      </span>
      <Button
        variant="ghost"
        className="min-h-11 shrink-0 px-2 text-sm text-primary"
        onClick={onAddTags}
      >
        {t("addTags")}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0"
        aria-label={t("closeHelp")}
        onClick={onDismiss}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
