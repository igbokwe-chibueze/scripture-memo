/** Shared client-only inbox; imported by production and preview client entries. */

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  AwardIcon,
  BellIcon,
  CheckCheckIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersRoundIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { showActionError } from "@/lib/errors/show-action-error";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LeagueResultDialog,
  type LeagueResultOutcome,
} from "@/features/notifications/components/league-result-dialog";
import type {
  NotificationItem,
  NotificationShellData,
} from "@/features/notifications/types/notification.types";
import type { NotificationInboxActions } from "@/features/notifications/types/notification-inbox.types";
import { cn } from "@/lib/utils";

/** Maps persistence event names to the visual weekly outcome family. */
function leagueOutcome(item: NotificationItem): LeagueResultOutcome | null {
  if (item.type === "LEAGUE_PROMOTED") return "promoted";
  if (item.type === "LEAGUE_DEMOTED") return "demoted";
  if (item.type === "LEAGUE_STAYED") return "stayed";
  return null;
}

/** Resolves Fellowship notices to their localized, stable event names. */
function fellowshipNoticeKey(item: NotificationItem): string | null {
  if (item.type === "FELLOWSHIP_LEADERSHIP") {
    switch (item.payload.event) {
      case "OFFER": return "leadershipOffer";
      case "ACCEPTED": return "leadershipAccepted";
      case "DECLINED": return "leadershipDeclined";
      case "CANCELLED": return "leadershipCancelled";
      case "BECAME_LEADER": return "leadershipReceived";
      case "ADMIN_TRANSFERRED": return "leadershipAdminTransferred";
      default: return "leadershipUpdate";
    }
  }
  if (item.type === "FELLOWSHIP_CLOSING") {
    switch (item.payload.event) {
      case "SCHEDULED": return "closureScheduled";
      case "CANCELLED": return "closureCancelled";
      case "CLOSED": return "closureCompleted";
      default: return "closureUpdate";
    }
  }
  if (item.type === "FELLOWSHIP_SUSPENSION") {
    return item.payload.event === "RESTORED"
      ? "suspensionRestored"
      : "suspensionStarted";
  }
  if (item.type === "FELLOWSHIP_APPEAL") {
    switch (item.payload.event) {
      case "SUBMITTED": return "appealSubmitted";
      case "RESTORED": return "appealAccepted";
      case "UPHELD": return "appealDenied";
      default: return null;
    }
  }
  return null;
}

/** Renders the established inbox icon for both the list and detail view. */
function notificationIcon(item: NotificationItem): React.ReactNode {
  if (item.type === "BADGE_AWARDED") {
    return <AwardIcon aria-hidden="true" />;
  }
  if (item.type === "FELLOWSHIP_LEADERSHIP") {
    return <UsersRoundIcon aria-hidden="true" />;
  }
  if (
    item.type === "FELLOWSHIP_CLOSING" ||
    item.type === "FELLOWSHIP_SUSPENSION" ||
    item.type === "FELLOWSHIP_APPEAL"
  ) {
    return <ShieldAlertIcon aria-hidden="true" />;
  }

  const outcome = leagueOutcome(item);
  if (outcome === "promoted") return <TrendingUpIcon aria-hidden="true" />;
  if (outcome === "demoted") return <TrendingDownIcon aria-hidden="true" />;
  return <MinusIcon aria-hidden="true" />;
}

/** Returns only known in-app destinations; payload text can never set an origin. */
function notificationDestination(
  item: NotificationItem,
): {
  href: string;
  label: "viewBadges" | "openFellowship" | "viewLeaderboard";
} | null {
  if (item.type === "BADGE_AWARDED") {
    return { href: "/vault/badges", label: "viewBadges" };
  }

  if (
    item.type === "FELLOWSHIP_LEADERSHIP" ||
    item.type === "FELLOWSHIP_CLOSING" ||
    item.type === "FELLOWSHIP_SUSPENSION" ||
    item.type === "FELLOWSHIP_APPEAL"
  ) {
    const slug = item.payload.fellowshipSlug;
    return typeof slug === "string"
      ? {
          href: `/fellowships/${encodeURIComponent(slug)}`,
          label: "openFellowship",
        }
      : null;
  }

  if (leagueOutcome(item)) {
    return { href: "/leaderboard", label: "viewLeaderboard" };
  }

  return null;
}

/**
 * Provides an on-demand inbox and one-time weekly-result celebration.
 *
 * The component never polls. Server-rendered shell data changes during normal
 * navigation. Opening a notice updates its local read state immediately and
 * restores it if the server cannot persist that acknowledgement.
 */
export function NotificationInbox({
  data,
  actions,
}: Readonly<{
  data: NotificationShellData;
  actions: NotificationInboxActions;
}>): React.ReactNode {
  const t = useTranslations("Notifications");
  const leagueT = useTranslations("Leaderboard.leagues");
  const locale = useLocale();
  const [items, setItems] = useState(data.items);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);
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

  const notificationTitle = (item: NotificationItem): string => {
    const outcome = leagueOutcome(item);
    const fellowshipNotice = fellowshipNoticeKey(item);

    if (item.type === "BADGE_AWARDED") return t("badgeAwardedTitle");
    if (fellowshipNotice) return t(`${fellowshipNotice}Title`);
    if (outcome) return t(`${outcome}Title`);
    return t("systemTitle");
  };

  const notificationBody = (item: NotificationItem): string => {
    const outcome = leagueOutcome(item);
    const fellowshipNotice = fellowshipNoticeKey(item);

    if (item.type === "BADGE_AWARDED") {
      return t("badgeAwardedBody", {
        badge: item.payload.badgeName ?? "",
        reward: item.payload.rewardAmount ?? 0,
      });
    }
    if (fellowshipNotice) {
      return t(`${fellowshipNotice}Body`, {
        fellowship: item.payload.fellowshipName ?? "",
      });
    }
    if (outcome) {
      return t(`${outcome}Body`, {
        league: readableLeague(item.payload.currentLeague),
      });
    }
    return t("systemBody");
  };

  const notificationDate = (item: NotificationItem): string =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      new Date(item.createdAt),
    );

  useEffect(() => {
    if (!result) return;

    startTransition(async () => {
      const response = await actions.markPresented({
        notificationId: result.id,
      });

      if (!response.success) {
        toast.error(response.message, { duration: Infinity });
      }
    });
  }, [result, actions]);

  /** Marks an opened notice read immediately and restores it if persistence fails. */
  const markRead = (notificationId: string): void => {
    const wasUnread = items.some(
      (item) => item.id === notificationId && !item.read,
    );
    if (!wasUnread) return;

    // Opening a notice acknowledges it immediately in the interface. Restore
    // the unread indicator if the server cannot persist that acknowledgement.
    setItems((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
    );

    startTransition(async () => {
      try {
        const response = await actions.markRead({ notificationId });
        if (!response.success) {
          setItems((current) =>
            current.map((item) =>
              item.id === notificationId ? { ...item, read: false } : item,
            ),
          );
          showActionError(response);
          return;
        }
        toast.success(response.message);
      } catch {
        setItems((current) =>
          current.map((item) =>
            item.id === notificationId ? { ...item, read: false } : item,
          ),
        );
        toast.error(t("readFailed"), { duration: Infinity });
      }
    });
  };

  /** Opens a detail view in the existing sheet after acknowledging the notice. */
  const openNotification = (item: NotificationItem): void => {
    markRead(item.id);
    setSelectedItem(item);
  };

  const selectedDestination = selectedItem
    ? notificationDestination(selectedItem)
    : null;

  const markAllRead = (): void => {
    startTransition(async () => {
      try {
        const response = await actions.markAllRead(undefined);
        if (!response.success) {
          showActionError(response);
          return;
        }
        // Keep the existing unread count until persistence confirms success.
        // Failure therefore leaves Read all enabled for a later retry.
        setItems((current) => current.map((item) => ({ ...item, read: true })));
        toast.success(t("allRead"));
      } catch {
        toast.error(t("readFailed"), { duration: Infinity });
      }
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
          <span className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.65rem] font-bold text-primary-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedItem(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-[min(90vw,24rem)] border-border bg-card"
        >
          {selectedItem ? (
            <>
              <SheetHeader className="border-b pr-16">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 w-fit justify-start px-2"
                  onClick={() => setSelectedItem(null)}
                >
                  <ArrowLeftIcon aria-hidden="true" />
                  {t("backToNotifications")}
                </Button>
                <SheetTitle className="font-heading text-2xl font-bold">
                  {t("detailTitle")}
                </SheetTitle>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6">
                <div className="space-y-4 rounded-3xl border bg-background p-5">
                  <span className="grid size-12 place-items-center rounded-2xl bg-muted">
                    {notificationIcon(selectedItem)}
                  </span>
                  <h3 className="font-heading text-xl font-bold">
                    {notificationTitle(selectedItem)}
                  </h3>
                  <p className="text-base text-muted-foreground">
                    {notificationBody(selectedItem)}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {notificationDate(selectedItem)}
                  </p>
                </div>

                {selectedDestination && (
                    <NavigationButton
                      href={selectedDestination.href}
                      pendingLabel={t("openingDestination")}
                      className="min-h-12 w-full"
                    >
                      {t(selectedDestination.label)}
                    </NavigationButton>
                  )}
              </div>
            </>
          ) : (
            <>
              <SheetHeader className="border-b pr-16">
                <SheetTitle className="font-heading text-2xl font-bold">
                  {t("title")}
                </SheetTitle>
                <SheetDescription>{t("description")}</SheetDescription>
              </SheetHeader>

              <div className="flex items-center justify-end px-4">
                <LoadingButton
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={unreadCount === 0}
                  isPending={isPending}
                  pendingLabel={t("markingRead")}
                  onClick={markAllRead}
                >
                  <CheckCheckIcon aria-hidden="true" />
                  {t("markAllRead")}
                </LoadingButton>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
                {items.length === 0 ? (
                  <div className="grid min-h-56 place-items-center rounded-3xl border border-dashed text-center">
                    <div>
                      <BellIcon className="mx-auto size-9 text-muted-foreground" />
                      <p className="mt-3 font-heading text-lg font-bold">
                        {t("empty")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {items.map((item) => {
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => openNotification(item)}
                            className={cn(
                              "flex w-full touch-manipulation items-start gap-3 rounded-3xl border p-4 text-left transition active:translate-y-0.5 disabled:opacity-50",
                              !item.read && "border-primary/45 bg-primary/8",
                            )}
                          >
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted">
                              {notificationIcon(item)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-heading font-bold">
                                {notificationTitle(item)}
                              </span>
                              <span className="mt-1 block text-sm text-muted-foreground">
                                {notificationBody(item)}
                              </span>
                              <span className="mt-2 block text-xs font-bold text-muted-foreground">
                                {notificationDate(item)}
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
            </>
          )}
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
