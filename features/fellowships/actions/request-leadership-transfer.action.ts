"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { requestLeadershipTransferSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { verifyGovernancePassword } from "@/features/fellowships/actions/verify-governance-password";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/** Offers ownership to a current member after validating the leader's password. */
export async function requestLeadershipTransferAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = requestLeadershipTransferSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review the transfer details." };

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  const t = await getTranslations("Fellowships");
  try {
    const passwordStatus = await verifyGovernancePassword(
      session.user.id,
      parsed.data.password,
    );
    if (passwordStatus !== "valid") {
      return { success: false, message: t("governance.passwordIncorrect") };
    }

    const transfer = await fellowshipGovernanceRepository.requestLeadershipTransfer(
      session.user.id,
      parsed.data.fellowshipId,
      parsed.data.targetMemberId,
    );
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${transfer.slug}`);
    return { success: true, message: t("governance.transferOffered") };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Fellowship leadership offer failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
