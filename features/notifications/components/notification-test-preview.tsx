"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationInbox } from "@/features/notifications/components/notification-inbox";
import type { NotificationInboxActions } from "@/features/notifications/types/notification-inbox.types";
import type {
  NotificationItem,
  NotificationShellData,
} from "@/features/notifications/types/notification.types";
import type { ActionResult } from "@/types/api";

type Scenario = "connection" | "rejected" | "success" | "empty";

const scenarios: ReadonlyArray<{ value: Scenario; label: string }> = [
  { value: "connection", label: "Connection failure" },
  { value: "rejected", label: "Request rejected" },
  { value: "success", label: "Success" },
  { value: "empty", label: "Empty inbox" },
];

/**
 * Creates disposable responses without importing any persistence actions.
 * Each single-read/bulk-read operation fails once independently, then succeeds.
 * The delay exposes pending states using the real inbox transition. Remounting
 * discards these counters and all read state; nothing leaves browser memory.
 */
function createPreviewActions(scenario: Scenario): NotificationInboxActions {
  const attempted = new Set<string>();
  const respond = async (operation: string): Promise<ActionResult> => {
    const firstAttempt = !attempted.has(operation);
    attempted.add(operation);
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    if (firstAttempt && scenario === "connection") {
      throw new Error("Simulated preview connection failure.");
    }
    if (firstAttempt && scenario === "rejected") {
      return { success: false, message: "Test request rejected. Retry to succeed." };
    }
    return { success: true, message: "Test notification read." };
  };

  return {
    markRead: ({ notificationId }) => respond(notificationId),
    markAllRead: () => respond("all"),
    markPresented: async () => ({ success: true, message: "Preview only." }),
  };
}

/** Holds a stable transport per run; a new key resets the complete test inbox. */
function PreviewRun({ scenario }: Readonly<{ scenario: Scenario }>): React.ReactNode {
  const [actions] = useState(() => createPreviewActions(scenario));
  const previewNotices: ReadonlyArray<
    Pick<NotificationItem, "type" | "payload">
  > = [
    {
      type: "BADGE_AWARDED" as const,
      payload: { badgeName: "First Steps", rewardAmount: 100 },
    },
    {
      type: "LEAGUE_PROMOTED" as const,
      payload: { currentLeague: "DISCIPLE", finalRank: 4, crownAward: 3 },
    },
    { type: "SYSTEM" as const, payload: {} },
  ];
  const data: NotificationShellData = {
    items:
      scenario === "empty"
        ? []
        : previewNotices.map((notice, index) => ({
            id: `notification-preview-${index + 1}`,
            type: notice.type,
            payload: notice.payload,
            createdAt: `2026-09-${21 + index}T12:00:00.000Z`,
            read: false,
            presented: true,
          })),
    unreadCount: scenario === "empty" ? 0 : 3,
    pendingLeagueResult: null,
  };

  return <NotificationInbox data={data} actions={actions} />;
}

/**
 * Repeatable manual QA using the production inbox and synthetic unread notices.
 * No gameplay, account, network toggle, database seed, or reward is required.
 * This checks client recovery, not server authorization or database persistence.
 */
export function NotificationTestPreview(): React.ReactNode {
  const [scenario, setScenario] = useState<Scenario>("connection");
  const [run, setRun] = useState(0);

  return (
    <section
      id="notification-testing"
      aria-labelledby="notification-testing-title"
      className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"
    >
      <h2 id="notification-testing-title" className="font-heading text-xl font-bold">
        Notification testing
      </h2>
      <p className="text-sm text-muted-foreground">
        Sample notifications only. Your inbox and game progress stay unchanged.
      </p>
      {/* Stack controls at 375px; larger screens can display two columns. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {scenarios.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={scenario === option.value ? "default" : "outline"}
            aria-pressed={scenario === option.value}
            onClick={() => {
              setScenario(option.value);
              setRun((current) => current + 1);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Open a test notice to see its details and any destination. Opening it
        marks it read. In either failure scenario, return to the inbox after
        the error to confirm its unread state returns; retry to succeed. Read
        all remains available in the inbox. Close and reset to start again.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-bold">Test inbox</span>
        <PreviewRun key={run} scenario={scenario} />
        <Button
          type="button"
          variant="outline"
          onClick={() => setRun((current) => current + 1)}
        >
          Reset scenario
        </Button>
      </div>
    </section>
  );
}
