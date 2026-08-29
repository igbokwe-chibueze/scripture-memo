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
 * Removes the verse assignment from one hidden waypoint without learner history.
 *
 * The repository repeats the publication and history checks inside a serialized
 * transaction. This action supplies authentication, authorization, validation,
 * safe user feedback, and route invalidation around that guarded mutation.
 */
export async function unassignVerseFromWaypointAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = waypointIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Select a valid waypoint.",
    };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Authentication required.",
    };
  }

  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return {
      success: false,
      message: "Administrator access is required.",
    };
  }

  try {
    const result = await waypointRepository.unassignVerse(
      parsed.data.id,
      session.user.id,
      getRequestIp(requestHeaders),
    );

    if (result.status === "waypoint-missing") {
      return {
        success: false,
        message: "Waypoint no longer exists.",
        errorCode: "WP-010",
      };
    }

    if (result.status === "progress-locked") {
      return {
        success: false,
        message: "A waypoint with learner history cannot be unassigned.",
        errorCode: "WP-001",
      };
    }

    if (result.status === "published-locked") {
      return {
        success: false,
        message: "Hide this unstarted waypoint before unassigning it.",
        errorCode: "WP-002",
      };
    }

    if (result.status === "already-unassigned") {
      revalidatePath("/admin/waypoints");
      return {
        success: true,
        message: "Waypoint is already unassigned.",
      };
    }

    revalidatePath("/admin/waypoints");
    return {
      success: true,
      message: "Waypoint unassigned.",
    };
  } catch {
    return {
      success: false,
      message: "Unable to unassign the waypoint.",
      errorCode: "WP-009",
    };
  }
}
