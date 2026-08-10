"use server";

import { notificationRepository } from "@/features/notifications/repositories/notification.repository";
import { notificationIdSchema } from "@/features/notifications/schemas/notification-id.schema";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";

/** Records that the weekly-result celebration has been presented once. */
export async function markNotificationPresentedAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid notification." };
  }

  const session = await getServerSession();
  if (!session) {
    return { success: false, message: "Authentication required." };
  }

  await notificationRepository.markPresented(
    session.user.id,
    parsed.data.notificationId,
  );

  return { success: true, message: "Notification presented." };
}
