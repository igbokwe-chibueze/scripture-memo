"use server";

/** Social plan state is manually declared, not verified completion or rewards.
 * Validate before auth, derive identity from the session and restrict all roles.
 */
import { getTranslations } from "next-intl/server";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import {
  readingPlanIdSchema,
  readingPlanParticipationSchema,
} from "../schemas/reading-plan-participation.schema";
import { readingPlanParticipationRepository } from "../repositories/reading-plan-participation.repository";
import type { ReadingPlanParticipants } from "../types/reading-plan-participation.types";

/** One conditional mutation; the response day enables client-side daily batching. */
export async function updateReadingPlanParticipationAction(
  input: unknown,
): Promise<ActionResult<{ day: string }>> {
  const parsed = readingPlanParticipationSchema.safeParse(input);
  const t = await getTranslations("ReadingPlans");
  if (!parsed.success)
    return { success: false, message: t("participationInvalid") };
  const session = await getServerSession();
  if (
    !session?.user ||
    !["USER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role ?? "")
  )
    return { success: false, message: t("participationAuth") };
  try {
    const now = new Date();
    await readingPlanParticipationRepository.update(
      session.user.id,
      parsed.data,
      now,
    );
    return {
      success: true,
      message: t("participationUpdated"),
      data: { day: now.toISOString().slice(0, 10) },
    };
  } catch (error) {
    logger.error("Reading plan participation update failed", { error });
    return {
      success: false,
      message: t("participationFailed"),
      errorCode: "BRP-001",
    };
  }
}

/** A bounded read only when a plan is opened or participation explicitly changes. */
export async function readReadingPlanParticipantsAction(
  input: unknown,
): Promise<ActionResult<ReadingPlanParticipants>> {
  const parsed = readingPlanIdSchema.safeParse(input);
  const t = await getTranslations("ReadingPlans");
  if (!parsed.success)
    return { success: false, message: t("participationInvalid") };
  const session = await getServerSession();
  if (
    !session?.user ||
    !["USER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role ?? "")
  )
    return { success: false, message: t("participationAuth") };
  try {
    const data = await readingPlanParticipationRepository.summary(
      session.user.id,
      parsed.data,
    );
    return { success: true, message: t("participationUpdated"), data };
  } catch (error) {
    logger.error("Reading plan participant preview failed", { error });
    return {
      success: false,
      message: t("participationFailed"),
      errorCode: "BRP-002",
    };
  }
}
