"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipConflictMessage } from "@/features/fellowships/actions/fellowship-action-helpers";
import { FellowshipConflictError, fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { regenerateFellowshipInviteSchema } from "@/features/fellowships/schemas/fellowship.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

type RegeneratedInvite = { inviteCode: string };

/** Rotates a Fellowship invite only after validating the authenticated leader. */
export async function regenerateFellowshipInviteAction(input: unknown): Promise<ActionResult<RegeneratedInvite>> {
  const parsed = regenerateFellowshipInviteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid fellowship." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  const t = await getTranslations("Fellowships");

  try {
    const regenerated = await fellowshipRepository.regenerateInvite(session.user.id, parsed.data.fellowshipId);
    revalidatePath(`/fellowships/${regenerated.slug}`);
    return { success: true, message: t("inviteRegenerated"), data: { inviteCode: regenerated.inviteCode } };
  } catch (error: unknown) {
    if (error instanceof FellowshipConflictError) return { success: false, message: await fellowshipConflictMessage(error) };
    logger.error("Fellowship invite regeneration failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
