import "server-only";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { evaluateBadgeProgress } from "@/features/badges/lib/badge-engine";
import { FellowshipConflictError } from "@/features/fellowships/repositories/fellowship.repository";
import type { FellowshipMutationData } from "@/features/fellowships/types/fellowship.types";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

export async function fellowshipConflictMessage(error: FellowshipConflictError): Promise<string> {
  const t = await getTranslations("Fellowships");
  return t(`errors.${error.code}`);
}

/** Completes post-membership badge evaluation from a trusted repository result. */
export async function completeFellowshipJoin(userId: string, operation: () => Promise<{ slug: string }>): Promise<ActionResult<FellowshipMutationData>> {
  const t = await getTranslations("Fellowships");
  try {
    const fellowship = await operation();
    const badgeUnlocks = await evaluateBadgeProgress(userId, { type: "FELLOWSHIP_JOINED" });
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${fellowship.slug}`);
    return { success: true, message: t("joined"), data: { ...fellowship, badgeUnlocks } };
  } catch (error) {
    if (error instanceof FellowshipConflictError) return { success: false, message: await fellowshipConflictMessage(error) };
    logger.error("Fellowship join failed.", { error, userId });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
