"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { waypointRepository } from "@/features/waypoints/repositories/waypoint.repository";
import { waypointIdSchema } from "@/features/waypoints/schemas/waypoint.schema";

/** Hides one waypoint while preserving its verse and Journey Stage assignment. */
export async function hideWaypointAction(input: unknown): Promise<ActionResult> {
  const parsed = waypointIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid waypoint." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    await waypointRepository.hide(parsed.data.id, session.user.id, getRequestIp(requestHeaders));
    revalidatePath("/admin/waypoints");
    return { success: true, message: "Waypoint hidden." };
  } catch {
    return { success: false, message: "Unable to hide waypoint." };
  }
}
