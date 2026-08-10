import type { UserNotificationType } from "@/lib/generated/prisma/enums";

/** Safe serializable payload rendered by the protected application shell. */
export type NotificationItem = {
  id: string;
  type: UserNotificationType;
  payload: Record<string, string | number>;
  createdAt: string;
  read: boolean;
  presented: boolean;
};

/** One bounded shell result avoids continuous polling and unbounded history. */
export type NotificationShellData = {
  items: NotificationItem[];
  unreadCount: number;
  pendingLeagueResult: NotificationItem | null;
};
