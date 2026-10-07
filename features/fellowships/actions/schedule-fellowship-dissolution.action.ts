"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { fellowshipGovernanceRepository, FellowshipGovernanceError } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { scheduleFellowshipDissolutionSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { verifyGovernancePassword } from "@/features/fellowships/actions/verify-governance-password";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

/** Hides the Fellowship immediately but gives its leader seven days to cancel. */
export async function scheduleFellowshipDissolutionAction(
  input: unknown,
): Promise<ActionResult<{ caseNumber: string }>> {
  const parsed = scheduleFellowshipDissolutionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review the closure confirmation." };

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

    const result = await fellowshipGovernanceRepository.scheduleDissolution(
      session.user.id,
      parsed.data.fellowshipId,
      parsed.data.confirmationName,
    );
    revalidatePath("/fellowships");
    revalidatePath(`/fellowships/${result.slug}`);
    revalidatePath("/admin/fellowship-cases");
    return {
      success: true,
      message: `${t("governance.closureScheduled")} Case ${result.caseNumber}.`,
      data: { caseNumber: result.caseNumber },
    };
  } catch (error) {
    if (error instanceof FellowshipGovernanceError) {
      return { success: false, message: t(`errors.${error.code}`) };
    }
    logger.error("Fellowship closure scheduling failed.", { error, userId: session.user.id });
    return { success: false, message: t("errors.UNKNOWN") };
  }
}
