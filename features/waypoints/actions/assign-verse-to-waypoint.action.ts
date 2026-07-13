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
    if (result.status === "waypoint-missing") return { success: false, message: "Waypoint no longer exists." };
    if (result.status === "verse-unavailable") return { success: false, message: "That verse is no longer published." };
    if (result.status === "duplicate-stage") {
      return { success: false, message: `This verse already has that Journey Stage at waypoint ${result.existingNumber}.` };
    }
    if (result.status === "stage-order") {
      const stage = result.conflictingStage.toLowerCase();
      return { success: false, message: `Journey Stage order conflicts with the ${stage} appearance at waypoint ${result.conflictingNumber}.` };
    }
    revalidatePath("/admin/waypoints");
    return { success: true, message: "Waypoint assignment saved." };
  } catch {
    return { success: false, message: "Unable to save the waypoint assignment." };
  }
}
