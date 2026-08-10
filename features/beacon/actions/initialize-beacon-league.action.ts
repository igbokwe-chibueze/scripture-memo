"use server";

import { revalidatePath } from "next/cache";
import { beaconRepository } from "@/features/beacon/repositories/beacon.repository";
import { requireServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";

/**
 * Enrolls an authenticated learner in the current weekly competition.
 *
 * WHY: Opening a page must remain a read-only operation. First-time weekly
 * cohort creation is therefore an explicit authenticated mutation, while the
 * repository transaction remains responsible for race-safe placement.
 */
export async function initializeBeaconLeagueAction(): Promise<ActionResult> {
  const session = await requireServerSession();
  await beaconRepository.ensureCurrentMembership(session.user.id, new Date());
  revalidatePath("/leaderboard");
  return { success: true, message: "Weekly league ready." };
}
