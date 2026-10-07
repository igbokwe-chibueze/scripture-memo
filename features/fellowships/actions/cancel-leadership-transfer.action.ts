"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { cancelLeadershipTransferSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/** Withdraws only an unanswered offer owned by the current Fellowship leader. */
export async function cancelLeadershipTransferAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = cancelLeadershipTransferSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid transfer offer." };

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  const t = await getTranslations("Fellowships");
  try {
    const fellowship = await fellowshipGovernanceRepository.cancelLeadershipTransfer(
      session.user.id,
      parsed.data.transferId,
    );
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${fellowship.slug}`);
    return { success: true, message: t("governance.transferCancelled") };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Fellowship leadership offer cancellation failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
