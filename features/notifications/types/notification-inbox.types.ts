import type { ActionResult } from "@/types/api";

/**
 * Client acknowledgement boundary: production supplies authenticated actions;
 * previews supply in-memory promises. Callbacks stay within the client boundary.
 */
export type NotificationInboxActions = {
  markRead: (input: { notificationId: string }) => Promise<ActionResult>;
  markAllRead: (input: undefined) => Promise<ActionResult>;
  markPresented: (input: { notificationId: string }) => Promise<ActionResult>;
};
