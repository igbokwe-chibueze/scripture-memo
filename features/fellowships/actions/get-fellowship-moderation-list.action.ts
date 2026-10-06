"use server";

import { fellowshipGovernanceRepository } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { fellowshipModerationSearchSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import type { FellowshipModerationItem } from "@/features/fellowships/types/fellowship.types";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";

/**
 * Loads only bounded, email-free data for the Super Admin recovery workspace.
 * Validation and role authorization remain here even when a server-rendered
 * page calls this action for its initial data.
 */
export async function getFellowshipModerationListAction(
  input: unknown,
): Promise<ActionResult<FellowshipModerationItem[]>> {
  const parsed = fellowshipModerationSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid Fellowship search." };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Insufficient permissions." };
  }

  const fellowships = await fellowshipGovernanceRepository.getModerationList(
    parsed.data.query,
  );
  return {
    success: true,
    message: "Fellowship recovery data loaded.",
    data: fellowships,
  };
}
