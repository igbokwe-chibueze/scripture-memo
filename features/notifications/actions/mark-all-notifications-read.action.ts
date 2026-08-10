"use server";

import { notificationRepository } from "@/features/notifications/repositories/notification.repository";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";
import { z } from "zod";

const emptyInputSchema = z.undefined();

/** Marks the current learner's inbox read without accepting client identity. */
export async function markAllNotificationsReadAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = emptyInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid notification request." };
  }

  const session = await getServerSession();
  if (!session) {
    return { success: false, message: "Authentication required." };
  }

  await notificationRepository.markAllRead(session.user.id);
  return { success: true, message: "Notifications read." };
}
