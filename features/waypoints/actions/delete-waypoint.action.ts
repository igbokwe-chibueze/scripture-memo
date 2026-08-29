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

/**
 * Deletes an unused trailing waypoint after authoritative server validation.
 *
 * The client supplies only the candidate ID. The repository independently
 * proves that it is still the final, hidden, unassigned, history-free record
 * while holding the curriculum lock, so a stale page cannot delete live data.
 */
export async function deleteWaypointAction(input: unknown): Promise<ActionResult> {
  const parsed = waypointIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid waypoint." };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    const result = await waypointRepository.deleteUnusedFinal(
      parsed.data.id,
      session.user.id,
      getRequestIp(requestHeaders),
    );

    if (result.status === "waypoint-missing") {
      return { success: false, message: "That waypoint no longer exists." };
    }
    if (result.status === "not-final") {
      return { success: false, message: "Only the final waypoint can be deleted." };
    }
    if (result.status === "published") {
      return { success: false, message: "Hide the final waypoint before deleting it." };
    }
    if (result.status === "assigned") {
      return { success: false, message: "Remove the final waypoint's assignment before deleting it." };
    }
    if (result.status === "progress-locked") {
      return { success: false, message: "A waypoint with learner history cannot be deleted." };
    }

    revalidatePath("/admin/waypoints");
    return {
      success: true,
      message: `Unused waypoint ${result.number} deleted.`,
    };
  } catch {
    return {
      success: false,
      message: "Unable to delete the unused waypoint.",
      errorCode: "WP-009",
    };
  }
}
