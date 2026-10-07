"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { verifyGovernancePassword } from "@/features/fellowships/actions/verify-governance-password";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { resolveFellowshipSuspensionAppealSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/**
 * Records an appeal outcome only for a trusted Super Admin. Validation and
 * password reauthentication happen here; reviewer independence and the
 * pending-case transition are checked again transactionally in the repository
 * so direct Server Action requests cannot bypass them. A restore or uphold is
 * paired atomically with the audit decision and resulting notifications.
 */
export async function resolveFellowshipSuspensionAppealAction(input: unknown): Promise<ActionResult> {
  const parsed = resolveFellowshipSuspensionAppealSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review the appeal decision details." };
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
    const result = await fellowshipGovernanceRepository.resolveSuspensionAppeal({
      adminId: session.user.id,
      suspensionId: parsed.data.suspensionId,
      decision: parsed.data.decision,
      decisionReason: parsed.data.decisionReason,
    });
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${result.slug}`);
    revalidatePath("/admin/fellowships");
    return { success: true, message: t(result.restored ? "governance.appealRestoredToast" : "governance.appealUpheldToast") };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Fellowship suspension appeal decision failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
