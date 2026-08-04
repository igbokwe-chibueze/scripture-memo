"use server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { evaluateBadgeProgress } from "@/features/badges/lib/badge-engine";
import { fellowshipConflictMessage } from "./fellowship-action-helpers";
import { FellowshipConflictError, fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { createFellowshipSchema } from "@/features/fellowships/schemas/fellowship.schema";
import type { FellowshipMutationData } from "@/features/fellowships/types/fellowship.types";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
/** Validates and creates one learner-led fellowship, then emits its badge event. */
export async function createFellowshipAction(input: unknown): Promise<ActionResult<FellowshipMutationData>> { const parsed = createFellowshipSchema.safeParse(input); if (!parsed.success) return { success: false, message: "Review the highlighted fellowship details.", fieldErrors: parsed.error.flatten().fieldErrors }; const session = await getServerSession(); if (!session?.user) return { success: false, message: "Authentication required." }; const t = await getTranslations("Fellowships"); try { const created = await fellowshipRepository.create(session.user.id, parsed.data); const badgeUnlocks = await evaluateBadgeProgress(session.user.id, { type: "FELLOWSHIP_CREATED" }); revalidatePath("/fellowships"); return { success: true, message: t("created"), data: { ...created, badgeUnlocks } }; } catch (error) { if (error instanceof FellowshipConflictError) return { success: false, message: await fellowshipConflictMessage(error) }; logger.error("Fellowship creation failed.", { error, userId: session.user.id }); return { success: false, message: t("errors.UNKNOWN") }; } }
