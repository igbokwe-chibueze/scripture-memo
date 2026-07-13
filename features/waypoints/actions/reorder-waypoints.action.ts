"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { waypointRepository } from "@/features/waypoints/repositories/waypoint.repository";
import { reorderWaypointsSchema } from "@/features/waypoints/schemas/waypoint.schema";

/** Persists the complete, server-verified ordering of all 220 waypoint records. */
export async function reorderWaypointsAction(input: unknown): Promise<ActionResult> {
  const parsed = reorderWaypointsSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "A complete 220-waypoint order is required." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const reordered = await waypointRepository.reorder(
      parsed.data.orderedWaypointIds,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    if (!reordered) return { success: false, message: "Waypoint slots changed. Refresh and try again." };
    revalidatePath("/admin/waypoints");
    return { success: true, message: "Waypoint order saved." };
  } catch {
    return { success: false, message: "Unable to save waypoint order." };
  }
}
