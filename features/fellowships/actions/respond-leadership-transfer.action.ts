"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { respondLeadershipTransferSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/** Lets only the invited member accept or decline a pending ownership offer. */
export async function respondLeadershipTransferAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = respondLeadershipTransferSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid transfer offer." };

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  const t = await getTranslations("Fellowships");
  try {
    const result = await fellowshipGovernanceRepository.respondLeadershipTransfer(
      session.user.id,
      parsed.data.transferId,
      parsed.data.response,
    );
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${result.slug}`);
    return {
      success: true,
      message: t(result.accepted ? "governance.transferAccepted" : "governance.transferDeclined"),
    };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Fellowship leadership response failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
