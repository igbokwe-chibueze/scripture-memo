"use client";

import { markAllNotificationsReadAction } from "@/features/notifications/actions/mark-all-notifications-read.action";
import { markNotificationPresentedAction } from "@/features/notifications/actions/mark-notification-presented.action";
import { markNotificationReadAction } from "@/features/notifications/actions/mark-notification-read.action";
import { NotificationInbox } from "@/features/notifications/components/notification-inbox";
import type { NotificationInboxActions } from "@/features/notifications/types/notification-inbox.types";
import type { NotificationShellData } from "@/features/notifications/types/notification.types";

// Bind persistence here. Production callers cannot select simulated responses
// via component props, URL parameters, or saved preferences.
const actions: NotificationInboxActions = {
  markRead: markNotificationReadAction,
  markAllRead: markAllNotificationsReadAction,
  markPresented: markNotificationPresentedAction,
};

/** Connects the real inbox to authenticated persistence actions. */
export function NotificationCenter({
  data,
}: Readonly<{ data: NotificationShellData }>): React.ReactNode {
  return <NotificationInbox data={data} actions={actions} />;
}
