"use server";

import { notificationRepository } from "@/features/notifications/repositories/notification.repository";
import { notificationIdSchema } from "@/features/notifications/schemas/notification-id.schema";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";

/** Marks one authenticated learner-owned notification as read. */
export async function markNotificationReadAction(input: unknown): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid notification." };
  }

  const session = await getServerSession();
  if (!session) {
    return { success: false, message: "Authentication required." };
  }

  await notificationRepository.markRead(
    session.user.id,
    parsed.data.notificationId,
  );

  return { success: true, message: "Notification read." };
}
