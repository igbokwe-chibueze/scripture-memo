"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { verifyGovernancePassword } from "@/features/fellowships/actions/verify-governance-password";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { restoreFellowshipSuspensionSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/**
 * Performs a reasoned Super Admin restoration when there is no appeal awaiting
 * review. If an appeal is pending, repository rules require an independent
 * reviewer and close that appeal as restored; if it was upheld, restoration is
 * permanently rejected. Passwords remain confined to Better Auth verification.
 */
export async function restoreFellowshipSuspensionAction(input: unknown): Promise<ActionResult> {
  const parsed = restoreFellowshipSuspensionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review the restoration details." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Insufficient permissions." };
  }

  const t = await getTranslations("Fellowships");
  try {
    const passwordStatus = await verifyGovernancePassword(session.user.id, parsed.data.password);
    if (passwordStatus !== "valid") {
      return { success: false, message: t("governance.passwordIncorrect") };
    }
    const result = await fellowshipGovernanceRepository.restoreSuspension({
      adminId: session.user.id,
      suspensionId: parsed.data.suspensionId,
      reason: parsed.data.reason,
    });
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${result.slug}`);
    revalidatePath("/admin/fellowships");
    return { success: true, message: t("governance.suspensionRestored") };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Super Admin Fellowship restoration failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
