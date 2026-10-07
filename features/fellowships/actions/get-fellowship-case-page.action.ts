"use server";

import { fellowshipGovernanceRepository } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { fellowshipCaseFiltersSchema } from "@/features/fellowships/schemas/fellowship-case-filters.schema";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import type { FellowshipGovernanceCasePage } from "@/features/fellowships/types/fellowship-case.types";

/** Returns one bounded case page only to an authenticated administrator. */
export async function getFellowshipCasePageAction(
  input: unknown,
): Promise<ActionResult<FellowshipGovernanceCasePage>> {
  const parsed = fellowshipCaseFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid Fellowship case filters." };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Insufficient permissions." };
  }

  const page = await fellowshipGovernanceRepository.getCasePage(parsed.data);
  return { success: true, message: "Fellowship cases loaded.", data: page };
}
