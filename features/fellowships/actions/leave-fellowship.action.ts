"use server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipConflictMessage } from "./fellowship-action-helpers";
import { FellowshipConflictError, fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { leaveFellowshipSchema } from "@/features/fellowships/schemas/fellowship.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
/** Removes the caller's membership while preserving leader-owned fellowships. */
export async function leaveFellowshipAction(input: unknown): Promise<ActionResult> { const parsed = leaveFellowshipSchema.safeParse(input); if (!parsed.success) return { success: false, message: "Select a valid fellowship." }; const session = await getServerSession(); if (!session?.user) return { success: false, message: "Authentication required." }; const t = await getTranslations("Fellowships"); try { await fellowshipRepository.leave(session.user.id, parsed.data.fellowshipId); revalidatePath("/fellowships"); return { success: true, message: t("left") }; } catch (error) { if (error instanceof FellowshipConflictError) return { success: false, message: await fellowshipConflictMessage(error) }; logger.error("Fellowship leave failed.", { error, userId: session.user.id }); return { success: false, message: t("errors.UNKNOWN") }; } }
