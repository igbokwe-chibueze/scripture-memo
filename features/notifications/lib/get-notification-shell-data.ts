import "server-only";

import { notificationRepository } from "@/features/notifications/repositories/notification.repository";
import type { NotificationShellData } from "@/features/notifications/types/notification.types";
import { requireServerSession } from "@/lib/auth/session";

/** Loads the authenticated learner's bounded notification inbox for the shell. */
export async function getNotificationShellData(): Promise<NotificationShellData> {
  const session = await requireServerSession();
  return notificationRepository.getShellData(session.user.id);
}
