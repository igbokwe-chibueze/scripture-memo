"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AwardIcon,
  BellIcon,
  CheckCheckIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { markAllNotificationsReadAction } from "@/features/notifications/actions/mark-all-notifications-read.action";
import { markNotificationPresentedAction } from "@/features/notifications/actions/mark-notification-presented.action";
import { markNotificationReadAction } from "@/features/notifications/actions/mark-notification-read.action";
import {
  LeagueResultDialog,
  type LeagueResultOutcome,
} from "@/features/notifications/components/league-result-dialog";
import type {
  NotificationItem,
  NotificationShellData,
} from "@/features/notifications/types/notification.types";
import { cn } from "@/lib/utils";

/** Maps persistence event names to the visual weekly outcome family. */
function leagueOutcome(item: NotificationItem): LeagueResultOutcome | null {
  if (item.type === "LEAGUE_PROMOTED") return "promoted";
  if (item.type === "LEAGUE_DEMOTED") return "demoted";
  if (item.type === "LEAGUE_STAYED") return "stayed";
  return null;
}

/**
 * Provides an on-demand inbox and one-time weekly-result celebration.
 *
 * The component never polls. Server-rendered shell data changes during normal
 * navigation, while local updates make acknowledgements feel immediate without
 * issuing a second read after each mutation.
 */
export function NotificationCenter({
  data,
}: Readonly<{ data: NotificationShellData }>): React.ReactNode {
  const t = useTranslations("Notifications");
  const leagueT = useTranslations("Leaderboard.leagues");
  const locale = useLocale();
  const router = useRouter();
  const [items, setItems] = useState(data.items);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(
    data.pendingLeagueResult !== null,
  );
  const [isPending, startTransition] = useTransition();
  const result = data.pendingLeagueResult;
  const outcome = result ? leagueOutcome(result) : null;
  const unreadCount = items.filter((item) => !item.read).length;

  const readableLeague = (value: string | number | undefined): string => {
    switch (value) {
      case "TRAVELER":
      case "DISCIPLE":
      case "MESSENGER":
      case "WATCHMAN":
      case "TEACHER":
      case "SHEPHERD":
      case "ELDER":
      case "SCRIBE":
      case "SAINT":
        return leagueT(value);
      default:
        return "";
    }
  };

  useEffect(() => {
    if (!result) return;

    startTransition(async () => {
      const response = await markNotificationPresentedAction({
        notificationId: result.id,
      });

      if (!response.success) {
        toast.error(response.message, { duration: Infinity });
      }
    });
  }, [result]);

  const markRead = (notificationId: string): void => {
    setItems((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
    );

    startTransition(async () => {
      const response = await markNotificationReadAction({ notificationId });
      if (!response.success) {
        toast.error(response.message, { duration: Infinity });
      }
    });
  };

  /** A badge notice doubles as a direct path to the learner's collection. */
  const openNotification = (item: NotificationItem): void => {
    markRead(item.id);

    if (item.type === "BADGE_AWARDED") {
      setSheetOpen(false);
      router.push("/vault/badges");
    }
  };

  const markAllRead = (): void => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));

    startTransition(async () => {
      const response = await markAllNotificationsReadAction(undefined);
      if (!response.success) {
        toast.error(response.message, { duration: Infinity });
        return;
      }

      toast.success(t("allRead"));
    });
  };

  const acknowledgeResult = (): void => {
    if (result) markRead(result.id);
    setResultOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={t("open")}
        onClick={() => setSheetOpen(true)}
        className="relative size-10 min-h-10 shrink-0 rounded-2xl border-border/70 bg-background shadow-none hover:translate-y-0 hover:bg-muted hover:shadow-none active:translate-y-0 active:scale-95 active:shadow-none dark:shadow-none dark:hover:shadow-none dark:active:shadow-none"
      >
        <BellIcon aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.65rem] font-black text-primary-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-[min(90vw,24rem)] border-border bg-card"
        >
          <SheetHeader className="border-b pr-16">
            <SheetTitle className="font-heading text-2xl font-black">
              {t("title")}
            </SheetTitle>
            <SheetDescription>{t("description")}</SheetDescription>
          </SheetHeader>

          <div className="flex items-center justify-end px-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={unreadCount === 0 || isPending}
              onClick={markAllRead}
            >
              <CheckCheckIcon aria-hidden="true" />
              {t("markAllRead")}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {items.length === 0 ? (
              <div className="grid min-h-56 place-items-center rounded-3xl border border-dashed text-center">
                <div>
                  <BellIcon className="mx-auto size-9 text-muted-foreground" />
                  <p className="mt-3 font-heading text-lg font-black">
                    {t("empty")}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => {
                  const itemOutcome = leagueOutcome(item);
                  const isBadgeAward = item.type === "BADGE_AWARDED";
                  const Icon =
                    isBadgeAward
                      ? AwardIcon
                      : itemOutcome === "promoted"
                      ? TrendingUpIcon
                      : itemOutcome === "demoted"
                        ? TrendingDownIcon
                        : MinusIcon;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(item)}
                        className={cn(
                          "flex w-full touch-manipulation items-start gap-3 rounded-3xl border p-4 text-left transition active:translate-y-0.5",
                          !item.read && "border-primary/45 bg-primary/8",
                        )}
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted">
                          <Icon aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-heading font-black">
                            {isBadgeAward
                              ? t("badgeAwardedTitle")
                              : itemOutcome
                                ? t(`${itemOutcome}Title`)
                                : t("systemTitle")}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {isBadgeAward
                              ? t("badgeAwardedBody", {
                                  badge: item.payload.badgeName ?? "",
                                  reward: item.payload.rewardAmount ?? 0,
                                })
                              : itemOutcome
                              ? t(`${itemOutcome}Body`, {
                                  league: readableLeague(item.payload.currentLeague),
                                })
                              : t("systemBody")}
                          </span>
                          <span className="mt-2 block text-xs font-bold text-muted-foreground">
                            {new Intl.DateTimeFormat(locale, {
                              dateStyle: "medium",
                            }).format(new Date(item.createdAt))}
                          </span>
                        </span>
                        {!item.read && (
                          <span className="mt-2 size-2.5 rounded-full bg-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {result && outcome && (
        <LeagueResultDialog
          open={resultOpen}
          outcome={outcome}
          league={readableLeague(result.payload.currentLeague)}
          finalRank={
            typeof result.payload.finalRank === "number"
              ? result.payload.finalRank
              : null
          }
          crownAward={
            typeof result.payload.crownAward === "number"
              ? result.payload.crownAward
              : 0
          }
          pending={isPending}
          onContinue={acknowledgeResult}
        />
      )}
    </>
  );
}
