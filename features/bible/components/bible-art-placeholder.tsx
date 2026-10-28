/** Deliberately labelled neutral artwork slot awaiting the owner's illustrations. */
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Placeholder proportions match the concept without introducing replacement artwork. */
export function BibleArtPlaceholder({
  className,
}: {
  className?: string;
}): React.ReactNode {
  const t = useTranslations("Bible");
  return (
    <div
      className={cn(
        "grid min-h-28 place-content-center gap-2 rounded-card border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-muted-foreground",
        className,
      )}
    >
      <ImageIcon
        aria-hidden="true"
        className="mx-auto size-8 text-primary/60"
      />
      <span className="text-xs">{t("illustrationPlaceholder")}</span>
    </div>
  );
}
