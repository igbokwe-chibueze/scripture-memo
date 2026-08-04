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
  if (error.code.startsWith("REQUEST_")) return t(`requestErrors.${error.code}`);
  return t(`errors.${error.code}`);
}

/** Completes either immediate public membership or a private access request. */
export async function completeFellowshipJoin(userId: string, operation: () => Promise<{ slug: string; joined: boolean }>): Promise<ActionResult<FellowshipMutationData>> {
  const t = await getTranslations("Fellowships");
  try {
    const fellowship = await operation();
    const badgeUnlocks = fellowship.joined ? await evaluateBadgeProgress(userId, { type: "FELLOWSHIP_JOINED" }) : [];
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${fellowship.slug}`);
    return { success: true, message: t(fellowship.joined ? "joined" : "requestSubmitted"), data: { slug: fellowship.slug, outcome: fellowship.joined ? "JOINED" : "REQUESTED", badgeUnlocks } };
  } catch (error) {
    if (error instanceof FellowshipConflictError) return { success: false, message: await fellowshipConflictMessage(error) };
    logger.error("Fellowship join failed.", { error, userId });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
