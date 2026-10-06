"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { cancelFellowshipDissolutionSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/** Restores a scheduled Fellowship only when its leader acts before the deadline. */
export async function cancelFellowshipDissolutionAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = cancelFellowshipDissolutionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid closure." };

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  const t = await getTranslations("Fellowships");
  try {
    const fellowship = await fellowshipGovernanceRepository.cancelDissolution(
      session.user.id,
      parsed.data.dissolutionId,
    );
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${fellowship.slug}`);
    return { success: true, message: t("governance.closureCancelled") };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Fellowship closure cancellation failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
