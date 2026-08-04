"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipConflictMessage } from "@/features/fellowships/actions/fellowship-action-helpers";
import { FellowshipConflictError, fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { updateFellowshipSchema } from "@/features/fellowships/schemas/fellowship.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

type UpdateFellowshipResult = { slug: string };

/** Validates identity settings and permits mutation only to the trusted leader. */
export async function updateFellowshipAction(input: unknown): Promise<ActionResult<UpdateFellowshipResult>> {
  const parsed = updateFellowshipSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review the highlighted fellowship details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  const t = await getTranslations("Fellowships");
  try {
    const updated = await fellowshipRepository.update(session.user.id, parsed.data);
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${updated.slug}`);
    return { success: true, message: t("updated"), data: updated };
  } catch (error: unknown) {
    if (error instanceof FellowshipConflictError) return { success: false, message: await fellowshipConflictMessage(error) };
    logger.error("Fellowship update failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}

