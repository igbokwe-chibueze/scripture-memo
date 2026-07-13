"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { JourneyStage, UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { waypointRepository } from "@/features/waypoints/repositories/waypoint.repository";
import { assignWaypointSchema } from "@/features/waypoints/schemas/waypoint.schema";

/** Assigns a published verse and explicit Journey Stage to one waypoint. */
export async function assignVerseToWaypointAction(input: unknown): Promise<ActionResult> {
  const parsed = assignWaypointSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a published verse and Journey Stage." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const result = await waypointRepository.assignVerse(
      parsed.data.waypointId,
      parsed.data.verseId,
      parsed.data.journeyStage as JourneyStage,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    if (result.status === "waypoint-missing") return { success: false, message: "Waypoint no longer exists.", errorCode: "WP-010" };
    if (result.status === "progress-locked") return { success: false, message: "A waypoint with learner history cannot be reassigned.", errorCode: "WP-001" };
    if (result.status === "published-locked") return { success: false, message: "Hide this unstarted waypoint before changing its assignment.", errorCode: "WP-002" };
    if (result.status === "verse-unavailable") return { success: false, message: "That verse is no longer published.", errorCode: "WP-003" };
    if (result.status === "duplicate-stage") {
      return { success: false, message: `This verse already has that Journey Stage at waypoint ${result.existingNumber}.`, errorCode: "WP-004" };
    }
    if (result.status === "stage-order") {
      const stage = result.conflictingStage.toLowerCase();
      return { success: false, message: `Journey Stage order conflicts with the ${stage} appearance at waypoint ${result.conflictingNumber}.`, errorCode: "WP-005" };
    }
    revalidatePath("/admin/waypoints");
    return { success: true, message: "Waypoint assignment saved." };
  } catch {
    return { success: false, message: "Unable to save the waypoint assignment.", errorCode: "WP-009" };
  }
}
