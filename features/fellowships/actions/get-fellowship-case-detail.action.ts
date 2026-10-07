"use server";

import { fellowshipGovernanceRepository } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { fellowshipCaseNumberSchema } from "@/features/fellowships/schemas/fellowship-case-filters.schema";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import type { FellowshipGovernanceCaseDetail } from "@/features/fellowships/types/fellowship-case.types";

/** Returns one case timeline only to an authenticated administrator. */
export async function getFellowshipCaseDetailAction(
  input: unknown,
): Promise<ActionResult<FellowshipGovernanceCaseDetail>> {
  const parsed = fellowshipCaseNumberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid Fellowship case number." };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Insufficient permissions." };
  }

  const governanceCase = await fellowshipGovernanceRepository.getCaseDetail(parsed.data);
  if (!governanceCase) {
    return { success: false, message: "Fellowship case not found." };
  }
  return {
    success: true,
    message: "Fellowship case loaded.",
    data: governanceCase,
  };
}
