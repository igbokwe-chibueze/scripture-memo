"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { verifyGovernancePassword } from "@/features/fellowships/actions/verify-governance-password";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { suspendFellowshipSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/**
 * Starts Super Admin enforcement only after validating the entire submitted
 * payload, reading the trusted Better Auth session, checking the server role,
 * and re-verifying the actor's password. The repository owns locking, active
 * state validation, transactional request cancellation, audit, and notices;
 * path revalidation runs only after that transaction commits. Credentials are
 * never copied into repository data, audit metadata, or success responses.
 */
export async function suspendFellowshipAction(
  input: unknown,
): Promise<ActionResult<{ caseNumber: string }>> {
  const parsed = suspendFellowshipSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review the suspension details." };

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
    const result = await fellowshipGovernanceRepository.suspendFellowship({
      adminId: session.user.id,
      fellowshipId: parsed.data.fellowshipId,
      confirmationName: parsed.data.confirmationName,
      reason: parsed.data.reason,
    });
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${result.slug}`);
    revalidatePath("/admin/fellowships");
    revalidatePath("/admin/fellowship-cases");
    return {
      success: true,
      message: `${t("governance.suspensionComplete")} Case ${result.caseNumber}.`,
      data: { caseNumber: result.caseNumber },
    };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Super Admin Fellowship suspension failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
