"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { evaluateBadgeProgress } from "@/features/badges/lib/badge-engine";
import { fellowshipConflictMessage } from "@/features/fellowships/actions/fellowship-action-helpers";
import { FellowshipConflictError, fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { resolveJoinRequestSchema } from "@/features/fellowships/schemas/fellowship.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/** Approves or rejects a request after repository-level fellowship ownership verification. */
export async function resolveFellowshipJoinRequestAction(input: unknown): Promise<ActionResult> {
  const parsed = resolveJoinRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid request decision." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  const t = await getTranslations("Fellowships");
  try {
    const result = await fellowshipRepository.resolveJoinRequest(session.user.id, parsed.data.requestId, parsed.data.decision);
    // WHY: Badge evaluation belongs after the transaction proves membership was
    // created; a rejected applicant must never receive fellowship progress.
    if (result.joined) await evaluateBadgeProgress(result.applicantUserId, { type: "FELLOWSHIP_JOINED" });
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${result.slug}`);
    return { success: true, message: t(result.joined ? "requestApproved" : "requestRejected") };
  } catch (error: unknown) {
    if (error instanceof FellowshipConflictError) return { success: false, message: await fellowshipConflictMessage(error) };
    logger.error("Fellowship request resolution failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
