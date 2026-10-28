"use client";

/** Four public portraits plus overflow, loaded only on the plan detail screen.
 * No polling; explicit successful participation changes invalidate this preview.
 */
import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PlayerAvatar } from "@/features/profile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { readReadingPlanParticipantsAction } from "../actions/reading-plan-participation.action";
import { useBibleResource } from "../hooks/use-bible-resource";
import { readingPlanIdSchema } from "../schemas/reading-plan-participation.schema";
import { PLAN_PARTICIPATION_UPDATED } from "../lib/reading-plan-participation-events";
import type { ReadingPlanId } from "../data/reading-plan-catalog";

/** Count and avatar previews come from the same server eligibility snapshot. */
export function BiblePlanParticipants({
  planId,
}: {
  planId: ReadingPlanId;
}): React.ReactNode {
  const t = useTranslations("ReadingPlans");
  const load = useCallback(
    () => readReadingPlanParticipantsAction(planId),
    [planId],
  );
  const { data, failed, retry } = useBibleResource(
    `plan-participants:${planId}`,
    load,
  );
  // Re-subscribing performs no read; only a validated matching change invalidates.
  useEffect(() => {
    function changed(event: Event): void {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      if (!detail || typeof detail !== "object" || !("planId" in detail))
        return;
      const parsed = readingPlanIdSchema.safeParse(detail.planId);
      if (parsed.success && parsed.data === planId) retry();
    }
    window.addEventListener(PLAN_PARTICIPATION_UPDATED, changed);
    return () =>
      window.removeEventListener(PLAN_PARTICIPATION_UPDATED, changed);
  }, [planId, retry]);

  if (failed)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("participantsUnavailable")}</span>
        <Button variant="ghost" className="min-h-11" onClick={retry}>
          {t("retryParticipation")}
        </Button>
      </div>
    );
  if (!data)
    return (
      <div
        className="flex items-center gap-2"
        aria-label={t("participantsLoading")}
      >
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-4 w-36" />
      </div>
    );
  if (data.total === 0)
    return (
      <p className="text-sm text-muted-foreground">{t("participantsEmpty")}</p>
    );
  const remaining = Math.max(0, data.total - data.avatars.length);
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1"
      data-plan-participants
    >
      <div
        className="flex items-center -space-x-3"
        aria-label={t("participantsLabel")}
      >
        {data.avatars.map((avatar, index) => (
          <span
            key={avatar.publicId}
            className="relative rounded-full ring-2 ring-background"
            style={{ zIndex: data.avatars.length - index }}
            title={avatar.displayName}
          >
            <PlayerAvatar
              avatarKey={avatar.avatarKey}
              frameKey={avatar.avatarFrameKey}
              displayName={avatar.displayName}
              size="sm"
              className="size-9"
            />
          </span>
        ))}
        {remaining > 0 && (
          <span
            className="relative grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted text-xs font-bold ring-2 ring-background"
            aria-label={t("participantsMore", { count: remaining })}
          >
            +{remaining}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {t("participantsCount", { count: data.total })}
      </p>
    </div>
  );
}
