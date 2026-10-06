"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import {
  emergencyFellowshipActionSchema,
  emergencyTransferLeadershipSchema,
} from "@/features/fellowships/schemas/fellowship-governance.schema";
import { verifyGovernancePassword } from "@/features/fellowships/actions/verify-governance-password";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/** Forces ownership recovery to an existing member with a reasoned audit event. */
export async function emergencyTransferLeadershipAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = emergencyTransferLeadershipSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review the recovery details." };

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Insufficient permissions." };
  }

  const t = await getTranslations("Fellowships");
  try {
    const passwordStatus = await verifyGovernancePassword(
      session.user.id,
      parsed.data.password,
    );
    if (passwordStatus !== "valid") {
      return { success: false, message: t("governance.passwordIncorrect") };
    }

    const fellowship = await fellowshipGovernanceRepository.emergencyTransferLeadership({
      adminId: session.user.id,
      fellowshipId: parsed.data.fellowshipId,
      targetMembershipId: parsed.data.targetMemberId,
      confirmationName: parsed.data.confirmationName,
      reason: parsed.data.reason,
    });
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${fellowship.slug}`);
    revalidatePath("/admin/fellowships");
    return { success: true, message: t("governance.emergencyTransferComplete") };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Super Admin Fellowship leadership recovery failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}

/** Immediately closes a Fellowship after Super Admin re-authentication and review. */
export async function emergencyDissolveFellowshipAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = emergencyFellowshipActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review the emergency closure details." };

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Insufficient permissions." };
  }

  const t = await getTranslations("Fellowships");
  try {
    const passwordStatus = await verifyGovernancePassword(
      session.user.id,
      parsed.data.password,
    );
    if (passwordStatus !== "valid") {
      return { success: false, message: t("governance.passwordIncorrect") };
    }

    const fellowship = await fellowshipGovernanceRepository.emergencyDissolution({
      adminId: session.user.id,
      fellowshipId: parsed.data.fellowshipId,
      confirmationName: parsed.data.confirmationName,
      reason: parsed.data.reason,
    });
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${fellowship.slug}`);
    revalidatePath("/admin/fellowships");
    return { success: true, message: t("governance.emergencyClosureComplete") };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Super Admin Fellowship emergency closure failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
