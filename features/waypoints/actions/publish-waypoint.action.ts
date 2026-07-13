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

/** Publishes a waypoint only when its assigned verse is currently published. */
export async function publishWaypointAction(input: unknown): Promise<ActionResult> {
  const parsed = waypointIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid waypoint." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const published = await waypointRepository.publish(parsed.data.id, session.user.id, getRequestIp(requestHeaders));
    if (!published) return { success: false, message: "Assign a published verse before publishing this waypoint." };
    revalidatePath("/admin/waypoints");
    return { success: true, message: "Waypoint published." };
  } catch {
    return { success: false, message: "Unable to publish waypoint." };
  }
}
