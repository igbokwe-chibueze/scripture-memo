"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipConflictMessage } from "@/features/fellowships/actions/fellowship-action-helpers";
import { FellowshipConflictError, fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { cancelJoinRequestSchema } from "@/features/fellowships/schemas/fellowship.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/** Cancels only the signed-in learner's own pending fellowship request. */
export async function cancelFellowshipJoinRequestAction(input: unknown): Promise<ActionResult> {
  const parsed = cancelJoinRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid request." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  const t = await getTranslations("Fellowships");
  try {
    const fellowship = await fellowshipRepository.cancelJoinRequest(session.user.id, parsed.data.requestId);
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${fellowship.slug}`);
    return { success: true, message: t("requestCancelled") };
  } catch (error: unknown) {
    if (error instanceof FellowshipConflictError) return { success: false, message: await fellowshipConflictMessage(error) };
    logger.error("Fellowship request cancellation failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
