"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import type { WaypointMove } from "@/features/waypoints/types/waypoint.types";
import { waypointRepository } from "@/features/waypoints/repositories/waypoint.repository";
import { reorderWaypointsSchema } from "@/features/waypoints/schemas/waypoint.schema";

/** Persists the complete, server-verified ordering of the current curriculum. */
export async function reorderWaypointsAction(input: unknown): Promise<ActionResult<{ moves: WaypointMove[] }>> {
  const parsed = reorderWaypointsSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "A complete waypoint order is required." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const result = await waypointRepository.reorder(
      parsed.data.orderedWaypointIds,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    if (result.status === "stale") return { success: false, message: "Waypoint slots changed. Refresh and try again." };
    if (result.status === "published-gap") return { success: false, message: "A hidden waypoint cannot be placed before a published waypoint." };
    if (result.status === "stage-order") return { success: false, message: "A later Journey Stage cannot be moved before an earlier stage of the same verse." };
    if (result.status === "progress-locked") return { success: false, message: "A published waypoint with learner progress cannot be moved." };
    if (result.status !== "reordered") return { success: false, message: "Unable to verify waypoint order." };
    revalidatePath("/admin/waypoints");
    const moved = result.moves.length;
    return {
      success: true,
      message: moved === 0 ? "Waypoint order is unchanged." : `${moved} waypoint position${moved === 1 ? "" : "s"} saved.`,
      data: { moves: result.moves },
    };
  } catch {
    return { success: false, message: "Unable to save waypoint order." };
  }
}
