"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { waypointRepository } from "@/features/waypoints/repositories/waypoint.repository";
import { createWaypointSchema } from "@/features/waypoints/schemas/waypoint.schema";

/** Appends one hidden, unassigned waypoint using only server-derived defaults. */
export async function createWaypointAction(input: unknown): Promise<ActionResult<{ id: string; number: number }>> {
  const parsed = createWaypointSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid waypoint request." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const waypoint = await waypointRepository.create(session.user.id, getRequestIp(requestHeaders));
    revalidatePath("/admin/waypoints");
    return {
      success: true,
      message: `Waypoint ${waypoint.number} added as a hidden draft.`,
      data: { id: waypoint.id, number: waypoint.number },
    };
  } catch {
    return { success: false, message: "Unable to add the next waypoint.", errorCode: "WP-009" };
  }
}
