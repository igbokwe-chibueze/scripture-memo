import type { Prisma } from "@/lib/generated/prisma/client";
import { UserNotificationType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  NotificationItem,
  NotificationShellData,
} from "@/features/notifications/types/notification.types";

const LEAGUE_RESULT_TYPES = [
  UserNotificationType.LEAGUE_PROMOTED,
  UserNotificationType.LEAGUE_DEMOTED,
  UserNotificationType.LEAGUE_STAYED,
] as const;

/** Converts trusted JSON into the small primitive payload accepted by the UI. */
function mapPayload(payload: Prisma.JsonValue): Record<string, string | number> {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(payload).filter(
      (entry): entry is [string, string | number] =>
        typeof entry[1] === "string" || typeof entry[1] === "number",
    ),
  );
}

/** Owns all persistent notification database access. */
export const notificationRepository = {
  /**
   * Loads a capped recent inbox for the shared shell in one indexed query.
   *
   * WHY: The shell must not poll PostgreSQL. A request-scoped read on normal
   * navigation provides fresh feedback while keeping database consumption
   * predictable and independent of how long a page stays open.
   */
  async getShellData(userId: string): Promise<NotificationShellData> {
    const rows = await prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        payload: true,
        readAt: true,
        presentedAt: true,
        createdAt: true,
      },
    });

    const items: NotificationItem[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      payload: mapPayload(row.payload),
      createdAt: row.createdAt.toISOString(),
      read: row.readAt !== null,
      presented: row.presentedAt !== null,
    }));

    return {
      items,
      unreadCount: items.filter((item) => !item.read).length,
      pendingLeagueResult:
        items.find(
          (item) =>
            !item.presented &&
            LEAGUE_RESULT_TYPES.some((type) => type === item.type),
        ) ?? null,
    };
  },

  /** Marks one owned notification as having opened its one-time celebration. */
  async markPresented(userId: string, notificationId: string): Promise<void> {
    await prisma.userNotification.updateMany({
      where: { id: notificationId, userId, presentedAt: null },
      data: { presentedAt: new Date() },
    });
  },

  /** Marks one owned notification read without leaking whether another ID exists. */
  async markRead(userId: string, notificationId: string): Promise<void> {
    await prisma.userNotification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  /** Acknowledges every unread notification for the authenticated learner. */
  async markAllRead(userId: string): Promise<void> {
    await prisma.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
} as const;
