"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { submitFellowshipSuspensionAppealSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/**
 * Submits the authenticated leader's one written appeal. The browser supplies
 * only the case identifier and statement; the repository confirms current
 * leadership, active suspension, unique appeal history, and server deadline
 * inside the Fellowship governance lock. This action never accepts an actor ID
 * from the client and revalidates both player and moderator screens on commit.
 */
export async function submitFellowshipSuspensionAppealAction(input: unknown): Promise<ActionResult> {
  const parsed = submitFellowshipSuspensionAppealSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Write an appeal of at least 30 characters." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  const t = await getTranslations("Fellowships");
  try {
    const result = await fellowshipGovernanceRepository.submitSuspensionAppeal(
      session.user.id,
      parsed.data.suspensionId,
      parsed.data.statement,
    );
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${result.slug}`);
    revalidatePath("/admin/fellowships");
    return { success: true, message: t("governance.appealSubmitted") };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Fellowship suspension appeal submission failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
