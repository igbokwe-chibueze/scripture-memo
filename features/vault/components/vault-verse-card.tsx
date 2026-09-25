/** Shared client-only Vault card markup; persistence belongs to its caller. */
import { useTranslations } from "next-intl";
import {
  BookHeartIcon,
  HeartIcon,
  LockKeyholeIcon,
  PlayIcon,
  StickyNoteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { cn } from "@/lib/utils";
import type { VaultVerseItem } from "@/features/vault/types/vault.types";

/** Renders the same mobile card and controls in the library and isolated QA. */
export function VaultVerseCard({
  verse,
  canReplay,
  sanctuaryHref,
  isPending,
  onReplay,
}: Readonly<{
  verse: VaultVerseItem;
  canReplay: boolean;
  sanctuaryHref: string;
  isPending: boolean;
  onReplay: () => void;
}>): React.ReactNode {
  const t = useTranslations("Vault");
  return (
    <article className="rounded-3xl border border-violet-500/15 bg-card/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-violet-700 uppercase dark:text-violet-300">
            {verse.translation}
          </p>
          <h3 className="mt-1 font-heading text-xl font-bold">
            {verse.reference}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {verse.hasPersonalNote && (
            <StickyNoteIcon
              className="size-5 text-violet-500"
              aria-label={t("privateNote")}
            />
          )}
          {verse.isFavorite && (
            <HeartIcon
              className="size-5 fill-rose-500 text-rose-500"
              aria-label={t("favorite")}
            />
          )}
        </div>
      </div>
      {verse.studyAccess === "LOCKED" ? (
        <div className="mt-4 flex min-h-18 items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300/50 bg-violet-500/5 text-sm font-bold text-violet-700 dark:text-violet-300">
          <LockKeyholeIcon className="size-4" aria-hidden="true" /> {t("practiceInProgress")}
        </div>
      ) : (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {verse.text}
        </p>
      )}
      {verse.packNames.length > 0 && (
        <p className="mt-3 text-xs font-bold text-muted-foreground">
          {verse.packNames.join(" · ")}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("completedStages")}>
        {verse.completedStages.map((stage) => (
          <span
            key={stage}
            className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[0.65rem] font-bold tracking-wide text-violet-700 uppercase dark:text-violet-300"
          >
            {stage}
          </span>
        ))}
      </div>
      {/* At 375px each translated label gets a full-width touch target. Wider
       * cards can place study and replay alongside each other without clipping. */}
      <div
        className={cn(
          "mt-5 grid gap-2",
          canReplay && verse.studyAccess === "AVAILABLE" && "sm:grid-cols-2",
        )}
      >
        {verse.studyAccess === "AVAILABLE" ? (
          <NavigationButton
            href={sanctuaryHref}
            pendingLabel={t("opening")}
            variant="outline"
            className="min-h-11"
          >
            <BookHeartIcon className="size-4" aria-hidden="true" /> {t("sanctuary")}
          </NavigationButton>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-xl"
            disabled
          >
            <LockKeyholeIcon aria-hidden="true" /> {t("studyLocked")}
          </Button>
        )}
        {canReplay && verse.studyAccess === "AVAILABLE" && (
          <LoadingButton
            type="button"
            isPending={isPending}
            pendingLabel={t("opening")}
            onClick={onReplay}
          >
            <PlayIcon data-icon="inline-start" aria-hidden="true" />
            {t("replayFromVault")}
          </LoadingButton>
        )}
      </div>
    </article>
  );
}
