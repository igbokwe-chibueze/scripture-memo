"use server";

import { completeFellowshipJoin } from "@/features/fellowships/actions/fellowship-action-helpers";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { joinFellowshipSchema } from "@/features/fellowships/schemas/fellowship.schema";
import type { FellowshipMutationData } from "@/features/fellowships/types/fellowship.types";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";

/** Submits an authenticated learner's request to a private fellowship. */
export async function requestFellowshipJoinAction(input: unknown): Promise<ActionResult<FellowshipMutationData>> {
  const parsed = joinFellowshipSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid fellowship." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  return completeFellowshipJoin(session.user.id, async () => ({
    ...(await fellowshipRepository.requestJoin(session.user.id, parsed.data.fellowshipId, "DIRECTORY")),
    joined: false,
  }));
}
